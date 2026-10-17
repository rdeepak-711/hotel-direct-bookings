import { describe, expect, it, vi } from "vitest";
import { isAllowedUrl, safeFetch, SafeFetchError } from "@/lib/safeFetch";

describe("isAllowedUrl", () => {
  it.each([
    "https://www.example.com/",
    "http://example.com/page?x=1",
  ])("allows public http(s) %s", (u) => expect(isAllowedUrl(u)).toBe(true));

  it.each([
    "ftp://example.com/",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "http://localhost/",
    "http://127.0.0.1/",
    "http://0.0.0.0/",
    "http://10.1.2.3/",
    "http://172.16.0.9/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://metadata.google.internal/",
    "http://my-box.local/",
    "not a url",
  ])("blocks %s", (u) => expect(isAllowedUrl(u)).toBe(false));
});

function fakeResponse(body: string, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(body, { status: init.status ?? 200, headers: { "content-type": "text/html", ...(init.headers ?? {}) } });
}

describe("safeFetch", () => {
  it("returns the body of an allowed page", async () => {
    const fetchImpl = vi.fn(async () => fakeResponse("<html>hi</html>"));
    const res = await safeFetch("https://example.com/", { fetchImpl });
    expect(res.body).toBe("<html>hi</html>");
    expect(res.finalUrl).toBe("https://example.com/");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.redirect).toBe("manual");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("refuses a blocked url without calling fetch", async () => {
    const fetchImpl = vi.fn();
    await expect(safeFetch("http://169.254.169.254/", { fetchImpl })).rejects.toBeInstanceOf(SafeFetchError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("follows up to maxRedirects and re-checks every hop", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(fakeResponse("", { status: 301, headers: { location: "https://b.example.com/" } }))
      .mockResolvedValueOnce(fakeResponse("", { status: 302, headers: { location: "http://127.0.0.1/admin" } }));
    await expect(safeFetch("https://a.example.com/", { fetchImpl, maxRedirects: 3 })).rejects.toThrow(/blocked/i);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("gives up after too many redirects", async () => {
    const fetchImpl = vi.fn(async (url: string) => fakeResponse("", { status: 302, headers: { location: url + "x" } }));
    await expect(safeFetch("https://a.example.com/", { fetchImpl, maxRedirects: 3 })).rejects.toThrow(/redirect/i);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("truncates bodies larger than maxBytes", async () => {
    const big = "a".repeat(5000);
    const res = await safeFetch("https://example.com/", { fetchImpl: async () => fakeResponse(big), maxBytes: 1000 });
    expect(res.body.length).toBe(1000);
    expect(res.truncated).toBe(true);
  });

  it("times out", async () => {
    const fetchImpl = (_: string, init: RequestInit) => new Promise<Response>((_, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    });
    await expect(safeFetch("https://slow.example.com/", { fetchImpl, timeoutMs: 20 })).rejects.toThrow(/timed out/i);
  });
});
