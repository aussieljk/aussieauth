/**
 * Local oxlint plugin. `no-classname` reports every `className` JSX attribute
 * and auto-fixes by removing it — run `oxlint --fix` to strip them all.
 */
const plugin = {
  meta: { name: "local" },
  rules: {
    "no-classname": {
      meta: {
        type: "suggestion",
        fixable: "code",
        messages: {
          removed: "className is not allowed — style with frosted props instead.",
        },
      },
      create(context: any) {
        const src = context.sourceCode;
        return {
          JSXAttribute(node: any) {
            if (node.name?.type !== "JSXIdentifier" || node.name.name !== "className") return;
            context.report({
              node,
              messageId: "removed",
              fix(fixer: any) {
                // Back up over the whitespace between this attribute and the
                // previous token so removal doesn't leave a double space.
                const text = src.getText();
                let start = node.range[0];
                while (start > 0 && /\s/.test(text[start - 1])) start--;
                return fixer.removeRange([start, node.range[1]]);
              },
            });
          },
        };
      },
    },
  },
};

export default plugin;
