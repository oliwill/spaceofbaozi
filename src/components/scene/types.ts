/** 场景壳向 React islands 传递的项目条目（Astro 构建期注入，D-124） */
export type SceneProject = {
  slug: string;
  title: string;
  intro: string;
  link?: string;
};
