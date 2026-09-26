import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeUploadService } from "@/features/media-upload/api/fake-upload-service";
import { createMockNoticeAdapter } from "@/entities/notice/api/mock-notices";
import { createMockRepositories } from "@/mocks/repositories";
import { ApiError } from "@/shared/api/error";
import type { AssetUploadService } from "@/features/media-upload/api/asset-upload-service";
import type { Repositories } from "@/shared/api/repositories";
import { createFixedClock } from "@/shared/lib/clock";
import { TEST_NOW, renderRoute } from "@/test/render-route";
import { installImageDecoderMock, installObjectUrlMock } from "@/test/object-url";

/**
 * 게시 신청 흐름 (명세 FR-SUB-01 ~ FR-SUB-04).
 *
 * 실제 route로 띄운다. guard와 셸을 지나 화면이 조립되는 경로까지 확인하기 위한 것이다.
 */
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];

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
  const submitSpy = vi.spyOn(repositories.submissions, "submit");
  return { repositories, createSpy, submitSpy };
}

async function openStudio(repositories?: Repositories) {
  const view = renderRoute("/studio?noticeId=notice-1041", {
    role: "SUBMITTER",
    repositories,
    services: { assetUpload: uploadService() },
  });
  await screen.findByDisplayValue("겨울 정기 공연 〈한밤의 물리학〉");
  return view;
}

async function uploadPoster(user: ReturnType<typeof userEvent.setup>) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("파일 입력을 찾지 못했습니다");
  await user.upload(input, posterFile());
  await screen.findByText(/업로드 완료/);
}

describe("게시 신청 스튜디오", () => {
  it("연결된 Ziggle 공지에서 제목과 상세 링크를 채운다", async () => {
    await openStudio();

    expect(
      screen.getByDisplayValue("겨울 정기 공연 〈한밤의 물리학〉"),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("https://ziggle.gistory.me/notice/notice-1041"),
    ).toBeInTheDocument();
    expect(screen.getByText("연결된 Ziggle 공지")).toBeInTheDocument();
  });

  it("없는 공지로 들어오면 신청을 막는다", async () => {
    renderRoute("/studio?noticeId=no-such-notice", {
      role: "SUBMITTER",
      services: { assetUpload: uploadService() },
    });

    expect(
      await screen.findByText("이 공지로는 신청할 수 없어요"),
    ).toBeInTheDocument();
  });

  it("제목을 바꾸면 미리보기에 바로 반영된다", async () => {
    const user = userEvent.setup();
    await openStudio();

    const title = screen.getByDisplayValue("겨울 정기 공연 〈한밤의 물리학〉");
    await user.clear(title);
    await user.type(title, "새 제목");

    const preview = screen.getByRole("main");
    expect(
      await within(preview).findByRole("heading", { name: "새 제목" }),
    ).toBeInTheDocument();
  });

  it("카테고리 변경도 미리보기가 따라온다", async () => {
    const user = userEvent.setup();
    await openStudio();
    const preview = screen.getByRole("main");

    // 공지에서 채워진 카테고리가 그대로 보인다.
    expect(within(preview).getByText("공연")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: /카테고리/ }));
    await user.click(await screen.findByRole("option", { name: "행사" }));

    expect(await within(preview).findByText("행사")).toBeInTheDocument();
  });

  it("상세 링크가 QR 값이 된다", async () => {
    await openStudio();

    expect(
      screen.getAllByLabelText(
        "QR 코드: https://ziggle.gistory.me/notice/notice-1041",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("새 신청을 작성할 때는 편집 대상을 조회하지 않는다", async () => {
    const { repositories } = studioRepositories();
    const getByIdSpy = vi.spyOn(repositories.submissions, "getById");
    await openStudio(repositories);

    expect(getByIdSpy).not.toHaveBeenCalled();
  });

  it("공지 바꾸기는 폼을 제출하지 않는다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy } = studioRepositories();
    await openStudio(repositories);

    await user.click(screen.getByRole("button", { name: "공지 바꾸기" }));

    expect(screen.queryByText(/포스터 이미지를 올려/)).not.toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("포스터 없이 제출하면 오류를 보여주고 신청을 만들지 않는다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy } = studioRepositories();
    await openStudio(repositories);

    await user.click(screen.getByRole("button", { name: "제출하기" }));

    expect(await screen.findByText(/포스터 이미지를 올려/)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("유효한 입력으로 승인 대기 신청을 1건 만든다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy, submitSpy } = studioRepositories();
    await openStudio(repositories);
    await uploadPoster(user);

    await user.click(screen.getByRole("button", { name: "제출하기" }));

    expect(await screen.findByText("신청이 접수되었어요")).toBeInTheDocument();
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).toHaveBeenCalledTimes(1);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("승인 대기")).toBeInTheDocument();

    const page = await repositories.submissions.list({
      status: "PENDING_REVIEW",
      limit: 50,
    });
    const mine = page.items.filter(
      (item) => item.title === "겨울 정기 공연 〈한밤의 물리학〉",
    );
    expect(mine).toHaveLength(1);
    expect(mine[0]?.status).toBe("PENDING_REVIEW");
  });

  it("제출 버튼을 두 번 눌러도 신청이 하나만 만들어진다", async () => {
    const user = userEvent.setup();
    const { repositories } = studioRepositories();
    await openStudio(repositories);
    await uploadPoster(user);

    const submit = screen.getByRole("button", { name: "제출하기" });
    await user.dblClick(submit);

    expect(await screen.findByText("신청이 접수되었어요")).toBeInTheDocument();

    const page = await repositories.submissions.list({
      status: "ALL",
      limit: 100,
    });
    const mine = page.items.filter(
      (item) => item.title === "겨울 정기 공연 〈한밤의 물리학〉",
    );
    expect(mine).toHaveLength(1);
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

    renderRoute("/studio?noticeId=notice-1041", {
      role: "SUBMITTER",
      services: { assetUpload: flaky },
    });
    await screen.findByDisplayValue("겨울 정기 공연 〈한밤의 물리학〉");

    const title = screen.getByDisplayValue("겨울 정기 공연 〈한밤의 물리학〉");
    await user.clear(title);
    await user.type(title, "재시도 확인");

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
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

    const svgBytes = [...'<svg xmlns="'].map((char) => char.charCodeAt(0));
    const bytes = new Uint8Array(2048);
    bytes.set(svgBytes, 0);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    await user.upload(
      input!,
      new File([bytes], "poster.jpg", { type: "image/jpeg" }),
    );

    expect(await screen.findByText(/파일 내용이 이미지 형식과 맞지/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "제출하기" }));
    expect(createSpy).not.toHaveBeenCalled();
  });
});

describe("수정 모드 (명세 FR-DASH-02)", () => {
  it("반려 건을 수정해 재제출하면 새로 만들지 않고 같은 신청이 승인 대기로 간다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy, submitSpy } = studioRepositories();
    const updateSpy = vi.spyOn(repositories.submissions, "update");

    renderRoute("/studio?submissionId=notice-901", {
      role: "SUBMITTER",
      repositories,
      services: { assetUpload: uploadService() },
    });

    // 기존 값이 채워진다.
    const title = await screen.findByDisplayValue("슈퍼-피셜 신입 부원 모집");
    await user.clear(title);
    await user.type(title, "슈퍼-피셜 겨울 모집");

    // 기존 카테고리가 그대로 채워진다.
    expect(screen.getByRole("combobox")).toHaveTextContent("동아리");

    // 반려 건은 "다시 신청"이다.
    await user.click(screen.getByRole("button", { name: "다시 신청하기" }));

    expect(await screen.findByText("다시 신청했어요")).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).toHaveBeenCalledWith("notice-901", expect.anything());

    const detail = await repositories.submissions.getById("notice-901");
    expect(detail.status).toBe("PENDING_REVIEW");
    expect(detail.title).toBe("슈퍼-피셜 겨울 모집");
    // 새 포스터를 올리지 않았으니 기존 포스터가 유지된다.
    expect(detail.posterUrl).not.toBe("");
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
      expect(screen.getByRole("combobox")).toHaveTextContent("동아리");
    });
  });

  it("게시 중인 신청은 수정을 막는다", async () => {
    renderRoute("/studio?submissionId=notice-001", {
      role: "SUBMITTER",
      services: { assetUpload: uploadService() },
    });

    expect(
      await screen.findByText(/지금 상태에서는 수정할 수 없어요/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "제출하기" })).toBeDisabled();
  });
});

describe("제출 실패와 복구 (명세 FR-SUB-04)", () => {
  it("생성 뒤 제출만 실패하면 입력을 고쳐 다시 내도 새로 만들지 않는다", async () => {
    const user = userEvent.setup();
    const { repositories, createSpy, submitSpy } = studioRepositories();
    const updateSpy = vi.spyOn(repositories.submissions, "update");
    submitSpy.mockRejectedValueOnce(new Error("network down"));
    await openStudio(repositories);
    await uploadPoster(user);

    await user.click(screen.getByRole("button", { name: "제출하기" }));
    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));

    // 실패 뒤 제목을 고치고 다시 낸다.
    const title = screen.getByDisplayValue("겨울 정기 공연 〈한밤의 물리학〉");
    await user.clear(title);
    await user.type(title, "겨울 정기 공연");
    await user.click(screen.getByRole("button", { name: "제출하기" }));

    expect(await screen.findByText("신청이 접수되었어요")).toBeInTheDocument();
    expect(createSpy).toHaveBeenCalledTimes(1);
    // 이미 만든 신청을 최신 입력으로 고친 뒤 제출한다.
    expect(updateSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ title: "겨울 정기 공연", version: 1 }),
      expect.anything(),
    );
  });

  it("수정 모드에서 제출이 실패한 뒤 다시 내도 자기 수정과 충돌하지 않는다", async () => {
    const user = userEvent.setup();
    const { repositories, submitSpy } = studioRepositories();
    submitSpy.mockRejectedValueOnce(new Error("network down"));
    renderRoute("/studio?submissionId=notice-901", {
      role: "SUBMITTER",
      repositories,
      services: { assetUpload: uploadService() },
    });
    const title = await screen.findByDisplayValue("슈퍼-피셜 신입 부원 모집");

    await user.click(screen.getByRole("button", { name: "다시 신청하기" }));
    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));

    await user.clear(title);
    await user.type(title, "슈퍼-피셜 겨울 모집");
    await user.click(screen.getByRole("button", { name: "다시 신청하기" }));

    expect(await screen.findByText("다시 신청했어요")).toBeInTheDocument();
    const detail = await repositories.submissions.getById("notice-901");
    expect(detail.title).toBe("슈퍼-피셜 겨울 모집");
    expect(detail.status).toBe("PENDING_REVIEW");
  });

  it("수정 모드에서 새 포스터 업로드가 실패하면 기존 포스터로 몰래 제출하지 않는다", async () => {
    const user = userEvent.setup();
    const { repositories, submitSpy } = studioRepositories();
    const updateSpy = vi.spyOn(repositories.submissions, "update");
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

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    await user.upload(input!, posterFile());
    await screen.findByRole("button", { name: "다시 시도" });

    await user.click(screen.getByRole("button", { name: "다시 신청하기" }));

    expect(await screen.findByText(/입력을 확인해 주세요/)).toBeInTheDocument();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("수정해서 다시 낸 뒤 닫으면 그 신청의 상세로 간다", async () => {
    const user = userEvent.setup();
    const { router } = renderRoute("/studio?submissionId=notice-901", {
      role: "SUBMITTER",
      services: { assetUpload: uploadService() },
    });
    await screen.findByDisplayValue("슈퍼-피셜 신입 부원 모집");

    await user.click(screen.getByRole("button", { name: "다시 신청하기" }));
    await screen.findByText("다시 신청했어요");
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/submissions/notice-901"),
    );
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
    await uploadPoster(user);

    await user.click(screen.getByRole("button", { name: "제출하기" }));

    expect(
      await screen.findByText("포스터 파일이 손상되었어요."),
    ).toBeInTheDocument();
  });
});

describe("공지 연결 (명세 FR-INT-01)", () => {
  it("이미 신청한 공지는 다시 고를 수 없고 새 신청은 빈 폼에서 시작한다", async () => {
    const user = userEvent.setup();
    await openStudio();
    await uploadPoster(user);
    await user.click(screen.getByRole("button", { name: "제출하기" }));
    await screen.findByText("신청이 접수되었어요");

    await user.click(screen.getByRole("button", { name: "새 신청 작성" }));

    // 방금 신청한 공지는 고를 수 있는 목록에서 빠진다.
    expect(
      await screen.findByText("기숙사 분리배출 방식 변경 안내"),
    ).toBeInTheDocument();
    expect(screen.queryByText("겨울 정기 공연 〈한밤의 물리학〉")).toBeNull();
  });

  it("이미 신청한 공지로 들어오면 이유와 내 신청 링크를 보여준다", async () => {
    const { repositories } = studioRepositories();
    await repositories.submissions.create({
      ziggleNoticeId: "notice-1041",
      title: "겨울 정기 공연",
      categoryId: "performance",
      assetId: "asset-1",
      detailUrl: "https://ziggle.gistory.me/notice/notice-1041",
      startAt: new Date(TEST_NOW.getTime() + 86_400_000),
      endAt: new Date(TEST_NOW.getTime() + 3 * 86_400_000),
      targetGroupIds: [],
    });
    renderRoute("/studio?noticeId=notice-1041", {
      role: "SUBMITTER",
      repositories,
      services: { assetUpload: uploadService() },
    });

    expect(
      await screen.findByText(/진행 중인 신청이 이미 있어요/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 신청 보기" })).toHaveAttribute(
      "href",
      "/submissions",
    );
  });

  it("공지를 불러오다 연결이 끊기면 막지 않고 다시 시도하게 한다", async () => {
    const user = userEvent.setup();
    let calls = 0;
    const notices = createMockNoticeAdapter({ clock: createFixedClock(TEST_NOW) });
    const flakyNotices = {
      ...notices,
      getById: async (id: string, signal?: AbortSignal) => {
        calls += 1;
        if (calls === 1) throw new TypeError("Failed to fetch");
        return notices.getById(id, signal);
      },
    };
    renderRoute("/studio?noticeId=notice-1041", {
      role: "SUBMITTER",
      services: { assetUpload: uploadService(), notices: flakyNotices },
    });

    expect(await screen.findByText("공지를 불러오지 못했어요")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(
      await screen.findByDisplayValue("겨울 정기 공연 〈한밤의 물리학〉"),
    ).toBeInTheDocument();
  });
});
