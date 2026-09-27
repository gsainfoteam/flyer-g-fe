import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeUploadService } from "@/features/media-upload/api/fake-upload-service";
import { createMockRepositories } from "@/mocks/repositories";
import { ApiError } from "@/shared/api/error";
import type { AssetUploadService } from "@/features/media-upload/api/asset-upload-service";
import type { Repositories } from "@/shared/api/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";
import {
  installImageDecoderMock,
  installObjectUrlMock,
} from "@/test/object-url";

/**
 * 게시 신청 흐름 (명세 FR-SUB-01 ~ FR-SUB-04, `API-CHANGES-BACKEND.md` 5절).
 *
 * 실제 route로 띄운다. guard와 셸을 지나 화면이 조립되는 경로까지 확인하기 위한 것이다.
 * Ziggle 공지 조회가 없어 모든 정보를 직접 입력한다.
 */
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];
const TITLE = "겨울 정기 공연";
const DETAIL_URL = "https://ziggle.gistory.me/notice/1041";

function posterFile(name = "poster.jpg"): File {
  const bytes = new Uint8Array(4096);
  bytes.set(JPEG_HEAD, 0);
  return new File([bytes], name, { type: "image/jpeg" });
}

beforeEach(() => {
  installObjectUrlMock();
  installImageDecoderMock();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const uploadService = (): AssetUploadService =>
  createFakeUploadService({
    tickMs: 0,
    tickCount: 2,
    createObjectUrl: () => "https://example.test/uploaded",
  });

function studioRepositories() {
  const repositories = createMockRepositories({
    clock: createFixedClock(TEST_NOW),
  });
  const createSpy = vi.spyOn(repositories.submissions, "create");
  const updateSpy = vi.spyOn(repositories.submissions, "update");
  const submitSpy = vi.spyOn(repositories.submissions, "submit");
  return { repositories, createSpy, updateSpy, submitSpy };
}

type User = ReturnType<typeof userEvent.setup>;

async function openStudio(repositories?: Repositories) {
  const view = renderRoute("/studio", {
    role: "SUBMITTER",
    repositories,
    services: { assetUpload: uploadService() },
  });
  await screen.findByRole("textbox", { name: /제목/ });
  return view;
}

async function chooseCategory(user: User, name: string) {
  await user.click(screen.getByRole("combobox", { name: /카테고리/ }));
  await user.click(await screen.findByRole("option", { name }));
}

/** 필수 입력(제목·카테고리)과 상세 링크를 채운다. 기간은 기본값을 쓴다. */
async function fillForm(user: User) {
  await user.type(screen.getByRole("textbox", { name: /제목/ }), TITLE);
  await chooseCategory(user, "공연");
  await user.type(
    screen.getByRole("textbox", { name: /상세 링크/ }),
    DETAIL_URL,
  );
}

async function uploadPoster(user: User) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("파일 입력을 찾지 못했습니다");
  await user.upload(input, posterFile());
  await screen.findByText(/업로드 완료/);
}

describe("게시 신청 스튜디오", () => {
  it("빈 폼에서 시작하고 TV에 나가는 정보를 직접 입력한다", async () => {
    await openStudio();

    expect(screen.getByRole("textbox", { name: /제목/ })).toHaveValue("");
    for (const label of [/부제/, /주최/, /장소/, /상세 링크/, /설명/]) {
      expect(screen.getByRole("textbox", { name: label })).toHaveValue("");
    }
    // 기간 규칙은 서버 설정에서 받아 안내한다.
    expect(
      await screen.findByText(/24시간 이후부터, 기간은 최대 3개월/),
    ).toBeInTheDocument();
  });

  it("제목·부제·주최·장소를 입력하면 미리보기에 바로 반영된다", async () => {
    const user = userEvent.setup();
    await openStudio();

    await user.type(screen.getByRole("textbox", { name: /제목/ }), "새 제목");
    await user.type(
      screen.getByRole("textbox", { name: /부제/ }),
      "금요일 저녁 7시",
    );
    await user.type(screen.getByRole("textbox", { name: /주최/ }), "페이드인");
    await user.type(screen.getByRole("textbox", { name: /장소/ }), "대강당");

    const preview = screen.getByRole("main");
    expect(
      await within(preview).findByRole("heading", { name: "새 제목" }),
    ).toBeInTheDocument();
    expect(within(preview).getByText("금요일 저녁 7시")).toBeInTheDocument();
    expect(within(preview).getByText("페이드인")).toBeInTheDocument();
    expect(within(preview).getByText("대강당")).toBeInTheDocument();
  });

  it("카테고리는 서버 목록에서 고르고 미리보기가 따라온다", async () => {
    const user = userEvent.setup();
    await openStudio();
    const preview = screen.getByRole("main");

    await chooseCategory(user, "행사");

    expect(await within(preview).findByText("행사")).toBeInTheDocument();
  });

  it("상세 링크가 QR 값이 되고, 비우면 QR 없이 게시된다고 알린다", async () => {
    const user = userEvent.setup();
    await openStudio();

    expect(
      screen.getByText("상세 링크가 없으면 TV에 QR 칸이 없어요."),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: /상세 링크/ }),
      DETAIL_URL,
    );

    expect(
      screen.getAllByLabelText(`QR 코드: ${DETAIL_URL}`).length,
    ).toBeGreaterThan(0);
  });

  it("새 신청을 작성할 때는 편집 대상을 조회하지 않는다", async () => {
    const { repositories } = studioRepositories();
    const getByIdSpy = vi.spyOn(repositories.submissions, "getById");
    await openStudio(repositories);

    expect(getByIdSpy).not.toHaveBeenCalled();
  });

  it("포스터 없이 제출하면 오류를 보여주고 신청을 만들지 않는다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy } = studioRepositories();
    await openStudio(repositories);
    await fillForm(user);

    await user.click(screen.getByRole("button", { name: "제출하기" }));

    expect(await screen.findByText(/포스터 이미지를 올려/)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("허용하지 않는 주소는 제출 전에 막는다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy } = studioRepositories();
    await openStudio(repositories);
    await fillForm(user);
    const link = screen.getByRole("textbox", { name: /상세 링크/ });
    await user.clear(link);
    await user.type(link, "https://evil.example.com/notice/1");
    await uploadPoster(user);

    await user.click(screen.getByRole("button", { name: "제출하기" }));

    expect(
      await screen.findByText(/ziggle.gistory.me의 https 주소만/),
    ).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("유효한 입력으로 한 번의 요청에 승인 대기 신청을 1건 만든다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy, submitSpy } = studioRepositories();
    await openStudio(repositories);
    await fillForm(user);
    await user.type(screen.getByRole("textbox", { name: /주최/ }), "페이드인");
    await uploadPoster(user);

    await user.click(screen.getByRole("button", { name: "제출하기" }));

    expect(await screen.findByText("신청이 접수되었어요")).toBeInTheDocument();
    // 생성과 제출이 한 번이다. 재검토 요청을 따로 보내지 않는다.
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).not.toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: TITLE,
        categoryId: "performance",
        detailUrl: DETAIL_URL,
        organizerName: "페이드인",
        subtitle: null,
        location: null,
      }),
      { idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/) },
    );

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("승인 대기")).toBeInTheDocument();
  });

  it("상세 링크 없이도 신청할 수 있다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy } = studioRepositories();
    await openStudio(repositories);
    await user.type(screen.getByRole("textbox", { name: /제목/ }), TITLE);
    await chooseCategory(user, "공연");
    await uploadPoster(user);

    await user.click(screen.getByRole("button", { name: "제출하기" }));

    expect(await screen.findByText("신청이 접수되었어요")).toBeInTheDocument();
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ detailUrl: null }),
      expect.anything(),
    );
  });

  it("제출 버튼을 두 번 눌러도 신청이 하나만 만들어진다", async () => {
    const user = userEvent.setup();
    const { repositories } = studioRepositories();
    await openStudio(repositories);
    await fillForm(user);
    await uploadPoster(user);

    await user.dblClick(screen.getByRole("button", { name: "제출하기" }));

    expect(await screen.findByText("신청이 접수되었어요")).toBeInTheDocument();
    const page = await repositories.submissions.list({
      status: "ALL",
      limit: 100,
    });
    expect(page.items.filter((item) => item.title === TITLE)).toHaveLength(1);
  });

  it("이미 신청한 공지 주소면 상세 링크 칸에 이유를 붙인다", async () => {
    const user = userEvent.setup();
    const { repositories } = studioRepositories();
    await repositories.submissions.create({
      title: "먼저 낸 신청",
      categoryId: "performance",
      assetId: "asset-1",
      detailUrl: DETAIL_URL,
      organizerName: null,
      subtitle: null,
      location: null,
      description: null,
      startAt: new Date(TEST_NOW.getTime() + 2 * 86_400_000),
      endAt: new Date(TEST_NOW.getTime() + 5 * 86_400_000),
      targetGroupIds: [],
    });
    await openStudio(repositories);
    await fillForm(user);
    await uploadPoster(user);

    await user.click(screen.getByRole("button", { name: "제출하기" }));

    expect(
      await screen.findByText("이 공지로 이미 신청한 게시물이 있습니다."),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /상세 링크/ })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("업로드가 실패해도 입력을 잃지 않고 재시도할 수 있다", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const flaky: AssetUploadService = {
      upload: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("network down");
        return {
          assetId: "asset-retry",
          url: "https://example.test/uploaded",
          width: 1200,
          height: 1600,
          mimeType: "image/jpeg",
          sizeBytes: 4096,
        };
      },
    };

    renderRoute("/studio", {
      role: "SUBMITTER",
      services: { assetUpload: flaky },
    });
    const title = await screen.findByRole("textbox", { name: /제목/ });
    await user.type(title, "재시도 확인");

    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    await user.upload(input!, posterFile());

    await screen.findByRole("button", { name: "다시 시도" });
    // 실패해도 입력값은 그대로다.
    expect(screen.getByDisplayValue("재시도 확인")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText(/업로드 완료/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("재시도 확인")).toBeInTheDocument();
  });

  it("키보드만으로 제출할 수 있다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy } = studioRepositories();
    await openStudio(repositories);
    await fillForm(user);
    await uploadPoster(user);

    const submit = screen.getByRole("button", { name: "제출하기" });
    submit.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
  });

  it("잘못된 형식은 업로드되지 않는다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy } = studioRepositories();
    await openStudio(repositories);
    await fillForm(user);

    const svgBytes = [...'<svg xmlns="'].map((char) => char.charCodeAt(0));
    const bytes = new Uint8Array(2048);
    bytes.set(svgBytes, 0);
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    await user.upload(
      input!,
      new File([bytes], "poster.jpg", { type: "image/jpeg" }),
    );

    expect(
      await screen.findByText(/파일 내용이 이미지 형식과 맞지/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "제출하기" }));
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("제출이 막히면 첫 문제 칸으로 포커스를 옮긴다", async () => {
    const user = userEvent.setup();
    await openStudio();

    await user.click(screen.getByRole("button", { name: "제출하기" }));

    // 포스터가 없다. 화면에서 가장 먼저 나오는 문제 칸은 포스터 입력이다.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector('input[type="file"]'),
      ),
    );
  });

  it("서버가 준 필드 오류를 해당 입력 칸에 붙인다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy } = studioRepositories();
    createSpy.mockRejectedValueOnce(
      new ApiError({
        kind: "http",
        code: "VALIDATION_FAILED",
        message: "invalid",
        status: 422,
        fields: { assetId: "포스터 파일이 손상되었어요." },
      }),
    );
    await openStudio(repositories);
    await fillForm(user);
    await uploadPoster(user);

    await user.click(screen.getByRole("button", { name: "제출하기" }));

    expect(
      await screen.findByText("포스터 파일이 손상되었어요."),
    ).toBeInTheDocument();
  });
});

describe("수정 모드 (명세 FR-DASH-02, `API-CHANGES-BACKEND.md` 5.6)", () => {
  function openEdit(submissionId: string, repositories?: Repositories) {
    return renderRoute(`/studio?submissionId=${submissionId}`, {
      role: "SUBMITTER",
      repositories,
      services: { assetUpload: uploadService() },
    });
  }

  it("반려 건은 고쳐서 저장한 뒤 재검토를 요청한다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy, updateSpy, submitSpy } =
      studioRepositories();
    openEdit("notice-901", repositories);

    // 기존 값이 채워진다.
    const title = await screen.findByDisplayValue("슈퍼-피셜 신입 부원 모집");
    expect(screen.getByDisplayValue("학생회관 305호")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /카테고리/ }),
    ).toHaveTextContent("동아리");
    await user.clear(title);
    await user.type(title, "슈퍼-피셜 겨울 모집");

    await user.click(screen.getByRole("button", { name: "다시 신청하기" }));

    expect(await screen.findByText("다시 신청했어요")).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).toHaveBeenCalledWith(
      "notice-901",
      { version: 3 },
      { idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/) },
    );

    const detail = await repositories.submissions.getById("notice-901");
    expect(detail.status).toBe("PENDING_REVIEW");
    expect(detail.title).toBe("슈퍼-피셜 겨울 모집");
    // 새 포스터를 올리지 않았으니 기존 포스터가 유지된다.
    expect(detail.posterUrl).not.toBe("");
  });

  it("검토 대기 중인 신청은 고쳐도 대기 그대로이고 재검토 요청을 보내지 않는다", async () => {
    const user = userEvent.setup();
    const { repositories, submitSpy } = studioRepositories();
    openEdit("notice-905", repositories);

    const location = await screen.findByDisplayValue("학생회관 1층 갤러리");
    expect(
      await screen.findByText("고쳐도 검토 대기 순서는 그대로예요"),
    ).toBeInTheDocument();
    await user.clear(location);
    await user.type(location, "학생회관 2층");
    await user.click(screen.getByRole("button", { name: "수정 저장" }));

    expect(await screen.findByText("수정했어요")).toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();
    const detail = await repositories.submissions.getById("notice-905");
    expect(detail).toMatchObject({
      status: "PENDING_REVIEW",
      location: "학생회관 2층",
    });
  });

  it("게시 시작 전 승인 건을 고치면 다시 승인을 받는다", async () => {
    const user = userEvent.setup();
    const { repositories } = studioRepositories();
    const created = await repositories.submissions.create({
      title: "예약된 공연",
      categoryId: "performance",
      assetId: "asset-1",
      detailUrl: null,
      organizerName: null,
      subtitle: null,
      location: null,
      description: null,
      startAt: new Date(TEST_NOW.getTime() + 2 * 86_400_000),
      endAt: new Date(TEST_NOW.getTime() + 5 * 86_400_000),
      targetGroupIds: [],
    });
    await repositories.reviews.approve({
      submissionId: created.id,
      revision: created.version,
    });
    openEdit(created.id, repositories);

    const subtitle = await screen.findByRole("textbox", { name: /부제/ });
    expect(
      await screen.findByText("고치면 다시 승인을 받아야 게시돼요"),
    ).toBeInTheDocument();
    await user.type(subtitle, "시간이 바뀌었어요");
    await user.click(screen.getByRole("button", { name: "다시 승인 받기" }));

    expect(await screen.findByText("수정했어요")).toBeInTheDocument();
    const detail = await repositories.submissions.getById(created.id);
    expect(detail.status).toBe("PENDING_REVIEW");
  });

  it("상세에서 넘어와 이미 받은 신청으로 열어도 카테고리가 유지된다", async () => {
    const { router } = renderRoute("/submissions/notice-901", {
      role: "SUBMITTER",
      services: { assetUpload: uploadService() },
    });
    await screen.findByRole("heading", { name: "슈퍼-피셜 신입 부원 모집" });

    await act(() => router.navigate("/studio?submissionId=notice-901"));

    await screen.findByDisplayValue("슈퍼-피셜 신입 부원 모집");
    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /카테고리/ }),
      ).toHaveTextContent("동아리");
    });
  });

  it("게시 중인 신청은 수정을 막는다", async () => {
    openEdit("notice-001");

    expect(
      await screen.findByText(/지금 상태에서는 수정할 수 없어요/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "제출하기" })).toBeDisabled();
  });

  it("재검토 요청만 실패하면 다시 눌러도 저장을 반복하지 않고 자기 저장과 충돌하지 않는다", async () => {
    const user = userEvent.setup();
    const { repositories, updateSpy, submitSpy } = studioRepositories();
    submitSpy.mockRejectedValueOnce(new Error("network down"));
    openEdit("notice-901", repositories);
    await screen.findByDisplayValue("슈퍼-피셜 신입 부원 모집");

    await user.click(screen.getByRole("button", { name: "다시 신청하기" }));
    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "다시 신청하기" }));

    expect(await screen.findByText("다시 신청했어요")).toBeInTheDocument();
    expect(updateSpy).toHaveBeenCalledTimes(1);
    // 두 번째 요청은 저장으로 올라간 버전을 쓰고, 같은 key로 보낸다.
    expect(submitSpy.mock.calls[1]).toEqual(submitSpy.mock.calls[0]);
    const detail = await repositories.submissions.getById("notice-901");
    expect(detail.status).toBe("PENDING_REVIEW");
  });

  it("재검토 요청이 실패한 뒤 입력을 고치면 최신 버전으로 다시 저장한다", async () => {
    const user = userEvent.setup();
    const { repositories, updateSpy, submitSpy } = studioRepositories();
    submitSpy.mockRejectedValueOnce(new Error("network down"));
    openEdit("notice-901", repositories);
    const title = await screen.findByDisplayValue("슈퍼-피셜 신입 부원 모집");

    // 첫 저장은 성공해 버전이 2에서 3으로 오르고, 재검토 요청만 실패한다.
    const location = screen.getByDisplayValue("학생회관 305호");
    await user.clear(location);
    await user.type(location, "학생회관 2층");
    await user.click(screen.getByRole("button", { name: "다시 신청하기" }));
    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));

    await user.clear(title);
    await user.type(title, "슈퍼-피셜 겨울 모집");
    await user.click(screen.getByRole("button", { name: "다시 신청하기" }));

    expect(await screen.findByText("다시 신청했어요")).toBeInTheDocument();
    expect(updateSpy).toHaveBeenLastCalledWith(
      "notice-901",
      expect.objectContaining({ title: "슈퍼-피셜 겨울 모집", version: 3 }),
    );
    const detail = await repositories.submissions.getById("notice-901");
    expect(detail.title).toBe("슈퍼-피셜 겨울 모집");
  });

  it("새 포스터 업로드가 실패하면 기존 포스터로 몰래 제출하지 않는다", async () => {
    const user = userEvent.setup();
    const { repositories, updateSpy, submitSpy } = studioRepositories();
    const failing: AssetUploadService = {
      upload: async () => {
        throw new Error("network down");
      },
    };
    renderRoute("/studio?submissionId=notice-901", {
      role: "SUBMITTER",
      repositories,
      services: { assetUpload: failing },
    });
    await screen.findByDisplayValue("슈퍼-피셜 신입 부원 모집");

    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    await user.upload(input!, posterFile());
    await screen.findByRole("button", { name: "다시 시도" });

    await user.click(screen.getByRole("button", { name: "다시 신청하기" }));

    expect(await screen.findByText(/입력을 확인해 주세요/)).toBeInTheDocument();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("고쳐서 낸 뒤 닫으면 그 신청의 상세로 간다", async () => {
    const user = userEvent.setup();
    const { router } = openEdit("notice-901");
    await screen.findByDisplayValue("슈퍼-피셜 신입 부원 모집");

    await user.click(screen.getByRole("button", { name: "다시 신청하기" }));
    await screen.findByText("다시 신청했어요");
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/submissions/notice-901"),
    );
  });
});
