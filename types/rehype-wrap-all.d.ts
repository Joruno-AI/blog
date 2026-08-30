declare module "rehype-wrap-all" {
  import type { Plugin } from "unified";

  type Options = {
    selector: string;
    wrapper: string;
  };

  const rehypeWrapAll: Plugin<[Options]>;
  export default rehypeWrapAll;
}
