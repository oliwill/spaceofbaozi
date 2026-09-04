import type { SceneProject } from "./types";
import "@/components/scene/scene.css";

type Props = {
  projects: SceneProject[];
};

/** 场景 3：项目矩阵（D-123）。卡片随场景 pin 滚动逐张拼装，由 sceneScroll.ts 的 ScrollTrigger 驱动（D-125）。 */
export default function SceneProjects({ projects }: Props) {
  return (
    <section className="scene-projects" aria-labelledby="scene-projects-title">
      <header>
        <p className="scene-projects__kicker">Projects · 03</p>
        <h1 className="scene-projects__title" id="scene-projects-title">
          正在做的事
        </h1>
        <p className="scene-projects__desc">参与、完成与持续试验的项目。</p>
      </header>

      {projects.length === 0 ? (
        <div className="scene-projects__empty">
          <p><strong>正在整理。</strong></p>
          <p>第一批项目整理好后会出现在这里。</p>
        </div>
      ) : (
        <ul className="scene-projects__grid">
          {projects.map((project) => (
            <li key={project.slug} className="scene-projects__card">
              {project.link ? (
                <a href={project.link} target="_blank" rel="noreferrer">
                  <h2>{project.title}</h2>
                  <p>{project.intro}</p>
                  <span className="scene-projects__arrow" aria-hidden="true">↗</span>
                </a>
              ) : (
                <a href={`/projects/${project.slug}`}>
                  <h2>{project.title}</h2>
                  <p>{project.intro}</p>
                  <span className="scene-projects__arrow" aria-hidden="true">→</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
