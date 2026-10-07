import { expect, test, type Locator, type Page } from "@playwright/test";

const article = "/blog/ryoutei-menu-05";
const rail = "main [data-article-reading]";
test.use({ contextOptions: { reducedMotion: "no-preference" } });

async function clickChapter(page: Page, slug: string) {
  await page.locator(`${rail} [data-reading-link="${slug}"]`).click();
}

async function expectChapterLabelAtLink(link: Locator) {
  const label = link.locator(".reading-contents__label");
  await expect(label).toHaveCSS("opacity", "1");
  await expect.poll(() => link.evaluate((element) => {
    const target = element.getBoundingClientRect();
    const tooltip = element.querySelector(".reading-contents__label")!.getBoundingClientRect();
    return Math.abs(tooltip.top + tooltip.height / 2 - target.top - target.height / 2);
  })).toBeLessThan(1);
  await expect(label).toBeInViewport({ ratio: 1 });
  expect(await label.evaluate((element) => {
    const list = element.closest("ol")!.getBoundingClientRect();
    return element.getBoundingClientRect().right - list.right;
  })).toBeGreaterThan(20);
}

async function waitForChapter(page: Page, slug: string) {
  const heading = page.locator(`[data-reading-prose] [id="${slug}"]`);
  await expect(heading).toBeFocused();
  await expect.poll(() => heading.evaluate((element) => {
    const dock = document.querySelector<HTMLElement>("[data-reading-obstruction]")!;

    const top = Number.parseFloat(getComputedStyle(dock).top) || 0;
    const offset = top + dock.getBoundingClientRect().height + 16;
    return Math.abs(element.getBoundingClientRect().top - offset);
  })).toBeLessThan(2);
}

async function scrollToFraction(page: Page, fraction: number) {
  await page.locator("[data-reading-prose]").evaluate((prose, t) => {
    const dock = document.querySelector<HTMLElement>("[data-reading-obstruction]")!;
        const bounds = dock.getBoundingClientRect();
    const dockHeight = bounds.height;
    const offset = (Number.parseFloat(getComputedStyle(dock).top) || 0) + dockHeight + 16;
    const body = prose.getBoundingClientRect();
    const start = Math.max(0, body.top + scrollY - offset);
    const end = body.bottom + scrollY - innerHeight;
    const top = end <= start ? Math.max(0, end) : start + (end - start) * t;
    window.scrollTo({ top: t === 1 ? Math.ceil(top) : top, behavior: "instant" });
  }, fraction);
}

async function dogGeometry(page: Page) {
  return page.locator("[data-reading-track]").evaluate((track) => {
    const dog = track.querySelector<HTMLElement>("[data-reading-dog]")!;
    const ball = track.querySelector<HTMLElement>("[data-reading-ball]")!;
    const bounds = track.getBoundingClientRect();
    const dogBounds = dog.getBoundingClientRect();
    return {
      x: dogBounds.left - bounds.left,
      gap: ball.getBoundingClientRect().left - dogBounds.right,
      maximum: Math.max(0, ball.offsetLeft - dog.offsetWidth - 8),
      right: dogBounds.right,
      trackRight: bounds.right,
      frame: getComputedStyle(dog).getPropertyValue("--reading-dog-frame").trim(),
    };
  });
}

async function useProseFixture(page: Page, content: string) {
  await page.route(/\/blog\/ryoutei-menu-05$/, async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const prose = /(<div[^>]*data-reading-prose[^>]*>)[\s\S]*?(<\/div>)/;
    expect(html).toMatch(prose);
    const body = html.replace(prose, `$1${content}$2`)
      .replace(/<nav[^>]*data-reading-chapters[^>]*>[\s\S]*?<\/nav>/, "");
    await route.fulfill({ response, body });
  });
}

test("桌面仅列主要章节，进度只覆盖正文并随倒读回退", async ({ page }) => {
  await page.goto(article);
  await expect(page.locator(rail)).toHaveCount(1);
  await expect(page.locator(".shell-nav [data-reading-progress], .shell-nav [data-reading-link]")).toHaveCount(0);
  await expect(page.locator("[data-reading-details]")).toHaveCount(0);
  await expect(page.locator(`${rail} [data-reading-link]`)).toHaveCount(3);
  await expect(page.locator(`${rail} [data-reading-link="茄烧油豆腐"]`)).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));
  const activeSlug = await page.locator("[data-reading-prose]").evaluate((prose) => {
    const headings = Array.from(prose.querySelectorAll("h2[id]"));
    return (headings.filter((heading) => heading.getBoundingClientRect().top <= innerHeight * 0.4).at(-1) ?? headings[0]).id;
  });
  await expect(page.locator(`${rail} [aria-current="location"]`)).toHaveAttribute("data-reading-link", activeSlug);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const progress = page.locator(`${rail} [data-reading-progress]`);
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await page.locator("[data-reading-prose]").evaluate((prose) => {
    window.scrollTo({ top: prose.getBoundingClientRect().bottom + scrollY - innerHeight + 2, behavior: "instant" });
  });
  await expect(progress).toHaveAttribute("aria-valuenow", "100");
  await expect(page.locator(`${rail} [aria-current="location"]`)).toHaveText("芝浜");
  const remainingPage = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY);
  expect(remainingPage).toBeGreaterThan(50);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
});

test("章节点击、重复点击和浏览器历史保留内容、焦点及滚动位置", async ({ page }) => {
  await page.goto(article);
  await clickChapter(page, "あくび指南");
  await waitForChapter(page, "あくび指南");
  const historyLength = await page.evaluate(() => history.length);
  await clickChapter(page, "あくび指南");
  await waitForChapter(page, "あくび指南");
  expect(await page.evaluate(() => history.length)).toBe(historyLength);

  await clickChapter(page, "馒头怖い");
  await waitForChapter(page, "馒头怖い");
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(encodeURIComponent("あくび指南")));
  await waitForChapter(page, "あくび指南");
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${article}$`));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(3);
  await expect(page.locator(".article-page__header h1")).toBeVisible();
  await page.goForward();
  await waitForChapter(page, "あくび指南");
  await expect(page.locator("[data-reading-prose]")).toContainText("祝福大家");
});

test("带hash直达、刷新和键盘激活得到相同的章节落点", async ({ page }) => {
  await page.goto(`${article}#${encodeURIComponent("茄烧油豆腐")}`);
  await waitForChapter(page, "茄烧油豆腐");
  await page.reload();
  await waitForChapter(page, "茄烧油豆腐");
  await page.locator(`${rail} [data-reading-link="あくび指南"]`).focus();
  await page.keyboard.press("Enter");
  await waitForChapter(page, "あくび指南");
});

test("带hash的文章离开后再返回保留实际阅读位置，不吸回原章节", async ({ page }) => {
  await page.goto(article);
  await clickChapter(page, "あくび指南");
  await waitForChapter(page, "あくび指南");
  const chapterY = await page.evaluate(() => scrollY);
  await page.mouse.move(1000, 500);
  await page.mouse.wheel(0, 700);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(chapterY + 680);
  await page.locator('.shell-links a[href="/blog"]').click();
  await expect(page.locator(".editorial-feature h2 a")).toBeVisible();
  await page.goBack();
  await expect(page.locator(`${rail} [data-reading-progress]`)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(chapterY + 650);
  await expect(page.locator("[data-reading-prose]")).toContainText("祝福大家");
});

test("新输入中止章节平滑滚动，不抢回焦点或跳到原目标", async ({ page }, testInfo) => {
  const { observeArticleInput } = await import("../support/real-input-observation");
  const observation = await observeArticleInput(page, testInfo);
  let failure: unknown, nextChapter: unknown;
  try {
    await page.goto(article);
    await expect(page.locator(`${rail} [data-reading-link="芝浜"]`)).toBeVisible();
    await expect(page.locator('[data-reading-prose] [id="芝浜"]')).toHaveCount(1);
    await observation.run(() => clickChapter(page, "芝浜"));
    await clickChapter(page, "あくび指南");
    await waitForChapter(page, "あくび指南");
    nextChapter = await page.locator('[data-reading-prose] [id="あくび指南"]').evaluate((heading) => {
      const dock = document.querySelector<HTMLElement>("[data-reading-obstruction]")!;
      const offset = (Number.parseFloat(getComputedStyle(dock).top) || 0) + dock.getBoundingClientRect().height + 16;
      return { focused: document.activeElement === heading, offsetError: Math.abs(heading.getBoundingClientRect().top - offset) };
    });
  } catch (error) { failure = error; throw error; }
  finally {
    try { await observation.finish({ nextChapter, failure: failure ? String(failure) : undefined }); }
    catch (error) { if (!failure) throw error; }
  }
});

for (const width of [360, 390, 767]) {
  test(`${width}px隐藏所有文章辅助而保留正文与五个单行入口`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    await page.goto(article);
    await expect(page.locator(rail)).toBeHidden();
    await expect(page.locator("[data-reading-progress]")).toBeHidden();
    await expect(page.locator(".reading-contents")).toBeHidden();
    await expect(page.locator("[data-reading-details]")).toHaveCount(0);
    await expect(page.locator('[data-reading-prose] h3[id="茄烧油豆腐"]')).toHaveCount(1);
    const navigation = page.locator(".shell-links");
    const slots = navigation.locator("a, .shell-links__inactive");
    await expect(slots).toHaveText(["01文章", "02照片", "03简历", "04项目", "05书影音"]);
    for (const slot of await slots.all()) await expect(slot).toBeVisible();
    expect(await navigation.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href"))))
      .toEqual(["/blog", "/photos", "/projects", "/media"]);
    const resume = navigation.locator("span.shell-links__inactive");
    await expect(resume).toHaveText(/^03\s*简历$/);
    await expect(resume).toHaveAttribute("aria-disabled", "true");
    expect(await resume.getAttribute("href")).toBeNull();
    expect(await resume.getAttribute("tabindex")).toBeNull();
    await expect(navigation.getByRole("link", { name: "简历", exact: true })).toHaveCount(0);
    const tops = await slots.evaluateAll((links) => links.map((link) => link.getBoundingClientRect().top));
    expect(tops).toHaveLength(5);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.goto(`${article}#${encodeURIComponent("茄烧油豆腐")}`);
    await expect(page.locator('[data-reading-prose] [id="茄烧油豆腐"]')).toBeFocused();
    await expect.poll(() => page.locator('[id="茄烧油豆腐"]').evaluate((heading) => Math.abs(heading.getBoundingClientRect().top - 16))).toBeLessThan(2);
    await context.close();
  });
}

test("减少动态效果时章节即时定位且没有显影动画", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(article);
  await clickChapter(page, "馒头怖い");
  await waitForChapter(page, "馒头怖い");
  expect(await page.locator("[data-reading-prose]").evaluate((prose) => prose.getAnimations({ subtree: true }).length)).toBe(0);
  await scrollToFraction(page, 0.5);
  await expect(page.locator("[data-reading-progress]")).toHaveAttribute("aria-valuenow", "50");
  expect((await dogGeometry(page)).frame).toBe("0");
  expect((await dogGeometry(page)).x).toBeGreaterThan(0);
  expect(await page.locator("[data-reading-track]").evaluate((track) => track.getAnimations({ subtree: true }).length)).toBe(0);
  await context.close();
});

test("嘉乐沿正文进度靠近球，结束停在球前8px，回滚可退且静止不循环", async ({ page }) => {
  await page.goto(article);
  await expect(page.locator("[data-reading-progress]")).toHaveAttribute("aria-valuenow", "0");
  expect((await dogGeometry(page)).x).toBeCloseTo(0, 0);
  await scrollToFraction(page, 0.5);
  await expect(page.locator("[data-reading-progress]")).toHaveAttribute("aria-valuenow", "50");
  const halfway = await dogGeometry(page);
  expect(Math.abs(halfway.x - halfway.maximum / 2)).toBeLessThan(1);
  await scrollToFraction(page, 1);
  await expect(page.locator("[data-reading-progress]")).toHaveAttribute("aria-valuenow", "100");
  await expect.poll(async () => (await dogGeometry(page)).gap).toBeCloseTo(8, 0);
  expect((await dogGeometry(page)).frame).toBe("0");
  expect(await page.locator("[data-reading-track]").evaluate((track) => track.getAnimations({ subtree: true }).length)).toBe(0);
  const resting = await dogGeometry(page);
  await page.waitForTimeout(150);
  expect(await dogGeometry(page)).toEqual(resting);
  await scrollToFraction(page, 0.25);
  await expect(page.locator("[data-reading-progress]")).toHaveAttribute("aria-valuenow", "25");
  const backwards = await dogGeometry(page);
  expect(backwards.x).toBeLessThan(halfway.x);
  expect(Math.abs(backwards.x - backwards.maximum / 4)).toBeLessThan(1);
});

test("追球轨道随桌面和平板重排，工具区始终在内容纸内", async ({ page }) => {
  await page.goto(article);
  for (const width of [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await scrollToFraction(page, 0.5);
    await expect(page.locator("[data-reading-progress]")).toHaveAttribute("aria-valuenow", "50");
    await expect.poll(async () => {
      const geometry = await dogGeometry(page);
      return Math.abs(geometry.x - geometry.maximum / 2);
    }).toBeLessThan(1);
    const geometry = await dogGeometry(page);
    expect(geometry.right).toBeLessThanOrEqual(geometry.trackRight);
    const bounds = await page.locator("[data-reading-obstruction]").evaluate((dock) => {
      const paper = dock.closest("main")!.getBoundingClientRect();
      const rect = dock.getBoundingClientRect();
      return { left: rect.left - paper.left, right: paper.right - rect.right, top: rect.top };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeGreaterThanOrEqual(0);
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("一屏内可见的短文直接完成，且无标题时不出现虚构目录", async ({ page }) => {
  await useProseFixture(page, "<p>这是一段只用于隔离测试的短文。</p>");
  await page.goto(article);
  await expect(page.locator("[data-reading-prose]")).toHaveText("这是一段只用于隔离测试的短文。");
  await expect(page.locator("[data-reading-details], [data-reading-link]")).toHaveCount(0);
  await scrollToFraction(page, 1);
  await expect(page.locator("[data-reading-progress]")).toHaveAttribute("aria-valuenow", "100");
  await expect.poll(async () => (await dogGeometry(page)).gap).toBeCloseTo(8, 0);
  expect((await dogGeometry(page)).frame).toBe("0");
});

test("无标题长文仍按正文推进，工具区尺寸变化后不产生NaN", async ({ page }) => {
  await useProseFixture(page, "<p>无标题长文的隔离测试段落。阅读辅助仍按实际正文长度计算。</p>".repeat(60));
  await page.goto(article);
  await expect(page.locator("[data-reading-details], [data-reading-link]")).toHaveCount(0);
  await expect(page.locator("[data-reading-progress]")).toHaveAttribute("aria-valuenow", "0");
  await scrollToFraction(page, 0.5);
  await expect(page.locator("[data-reading-progress]")).toHaveAttribute("aria-valuenow", "50");
  expect(Number.isFinite((await dogGeometry(page)).x)).toBe(true);
  await page.setViewportSize({ width: 1024, height: 844 });
  await scrollToFraction(page, 1);
  await expect(page.locator("[data-reading-progress]")).toHaveAttribute("aria-valuenow", "100");
  await expect.poll(async () => (await dogGeometry(page)).gap).toBeCloseTo(8, 0);
});

test("没有JavaScript也能阅读全文与章节锚点，不显示虚假零进度", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(article);
  await expect(page.locator("[data-reading-prose]")).toContainText("祝福大家");
  await expect(page.locator(`${rail} [data-reading-progress]`)).toBeHidden();
  await expect(page.locator(rail)).toHaveCSS("position", "static");
  const link = page.locator(`${rail} [data-reading-link="あくび指南"]`);
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(new RegExp(encodeURIComponent("あくび指南")));
  const heading = page.locator('[data-reading-prose] [id="あくび指南"]');
  await expect(heading).toBeInViewport();
  const bounds = await heading.evaluate((element) => ({
    headingTop: element.getBoundingClientRect().top,
    dockBottom: document.querySelector("[data-reading-obstruction]")!.getBoundingClientRect().bottom,
  }));
  expect(bounds.headingTop).toBeGreaterThanOrEqual(0);
  expect(bounds.headingTop).toBeGreaterThanOrEqual(bounds.dockBottom);
  await context.close();
});


test("章节短线长度、高亮与键盘文字提示可见且位于文章内", async ({ page }) => {
  await page.goto(article);
  const first = page.locator('[data-reading-link="あくび指南"]');
  const other = page.locator('[data-reading-link="芝浜"]');
  await expect(first).toHaveAttribute("aria-current", "location");
  await expect(first.locator(".reading-contents__tick")).toHaveCSS("width", "24px");
  await expect(other.locator(".reading-contents__tick")).toHaveCSS("width", "16px");
  await expect(other.locator(".reading-contents__label")).toHaveCSS("opacity", "0");
  for (const link of [first, other]) {
    await link.hover();
    await expectChapterLabelAtLink(link);
  }
  await page.mouse.move(1000, 500);
  await page.keyboard.press("Tab");
  await first.focus();
  await expectChapterLabelAtLink(first);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(other).toBeFocused();
  await expectChapterLabelAtLink(other);
  await page.keyboard.press("Enter");
  await waitForChapter(page, "芝浜");
  await expect(other).toHaveAttribute("aria-current", "location");
});


test("长章节列表在短桌面中可见，键盘提示不会被滚动框裁切", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(article);
  await page.locator("[data-reading-chapters] ol").evaluate((list) => {
    const first = list.firstElementChild!;
    while (list.children.length < 30) list.append(first.cloneNode(true));
    (list.closest("nav") as HTMLElement).style.setProperty("--chapter-count", "30");
  });
  await page.evaluate(() => window.scrollTo({ top: 1000, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(1000);
  const contents = page.locator("[data-reading-chapters]");
  const first = contents.locator("a").first();
  const third = contents.locator("a").nth(2);
  const last = contents.locator("a").last();
  const list = contents.locator("ol");
  for (const link of [first, third]) {
    await link.hover();
    await expectChapterLabelAtLink(link);
  }
  await page.mouse.move(1000, 500);
  await page.keyboard.press("Tab");
  await first.focus();
  await expectChapterLabelAtLink(first);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(third).toBeFocused();
  await expectChapterLabelAtLink(third);
  await list.hover();
  const previousY = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(Math.abs(await page.evaluate(() => scrollY) - previousY)).toBeLessThan(2);
  await last.focus();
  await expect(last).toBeInViewport();
  await expectChapterLabelAtLink(last);
  const penultimate = contents.locator("a").nth(28);
  await penultimate.focus();
  await expectChapterLabelAtLink(penultimate);
  const beforeScroll = await penultimate.evaluate((link) => link.getBoundingClientRect().top);
  await list.evaluate((element) => { element.scrollTop -= 32; });
  await expect.poll(() => penultimate.evaluate((link) => link.getBoundingClientRect().top)).toBeGreaterThan(beforeScroll + 30);
  await expectChapterLabelAtLink(penultimate);
  expect(await contents.evaluate((nav) => nav.getBoundingClientRect().bottom)).toBeLessThanOrEqual(708);
  await page.setViewportSize({ width: 1280, height: 800 });
  await last.focus();
  await expectChapterLabelAtLink(last);
});
