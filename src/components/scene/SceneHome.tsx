import { motion, useReducedMotion, type Variants } from "motion/react";
import { greetingByHour } from "@/lib/sections";
import "@/components/home-v2/home-v2-preview.css";

const NAV_ITEMS = [
  { label: "文章", href: "/blog" },
  { label: "照片", href: "/photos" },
  { label: "简历", href: "/resume" },
  { label: "项目", href: "/projects" },
];

const PRESS_TRANSITION = { type: "spring", duration: 0.4, bounce: 0.2 } as const;

/** 对焦式入场（D-124 / toss.im 配方）：模糊 + 上移 24px → 清晰 */
const focus: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(12px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { ease: [0.6, 0, 0, 0.6], duration: 0.6 },
  },
};

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

/** 场景 2：首页（Home v2 冻结构图 + 纸质索引 tab，D-118/D-123） */
export default function SceneHome() {
  const reduced = useReducedMotion();
  const now = new Date();
  const greeting = `${greetingByHour(now.getHours())} · ${now.getMonth() + 1}月${now.getDate()}日`;

  return (
    <section className="home-v2" aria-labelledby="scene-home-title">
      <div className="home-v2__paper">
        <header className="home-v2__header">
          <p className="home-v2__weather">
            <span aria-hidden="true">○</span> {greeting}
          </p>
          <nav className="home-v2__nav" aria-label="主要栏目">
            {NAV_ITEMS.map((item) => (
              <motion.a
                key={item.href}
                className="home-v2__tab"
                href={item.href}
                data-astro-prefetch="viewport"
                whileTap={reduced ? undefined : { opacity: 0.6 }}
                transition={reduced ? undefined : PRESS_TRANSITION}
              >
                {item.label}
              </motion.a>
            ))}
          </nav>
        </header>

        <main className="home-v2__hero">
          <motion.section
            className="home-v2__identity"
            variants={container}
            initial={reduced ? false : "hidden"}
            whileInView={reduced ? undefined : "visible"}
            viewport={{ once: true, amount: 0.4 }}
          >
            <motion.p className="home-v2__kicker" variants={focus}>
              个人档案 · 001
            </motion.p>
            <motion.h1 className="home-v2__title" id="scene-home-title" variants={focus}>
              <span>你好，</span>
              <span>我是包子。</span>
            </motion.h1>
            <motion.p className="home-v2__city" variants={focus}>
              <span>居住地</span>
              <strong>上海</strong>
            </motion.p>
            <motion.p className="home-v2__intro" variants={focus}>
              这里记录写作、照片、书影音，
              <br className="home-v2__desktop-break" />
              还有一些正在做的事。
            </motion.p>
            <motion.a
              className="home-v2__start"
              href="/blog"
              variants={focus}
              whileTap={reduced ? undefined : { opacity: 0.6 }}
              transition={reduced ? undefined : PRESS_TRANSITION}
            >
              <span>从文章开始</span>
              <span aria-hidden="true">↗</span>
            </motion.a>
          </motion.section>

          <figure
            className="home-v2__portrait"
            data-role-layout="frozen"
            aria-label="包子与嘉乐的水彩剪纸静态构图"
          >
            <span className="home-v2__wash" aria-hidden="true"></span>
            <span className="home-v2__person" aria-hidden="true"></span>
            <span className="home-v2__dog-shadow" aria-hidden="true"></span>
            <span className="home-v2__dog" aria-hidden="true"></span>
          </figure>
        </main>

        <section className="home-v2__blog-peek" aria-labelledby="scene-home-blog-title">
          <div>
            <p>01 / 文章</p>
            <h2 id="scene-home-blog-title">文章</h2>
          </div>
          <p>最近写下的文章与短记</p>
          <span aria-hidden="true">↓</span>
        </section>
      </div>
    </section>
  );
}
