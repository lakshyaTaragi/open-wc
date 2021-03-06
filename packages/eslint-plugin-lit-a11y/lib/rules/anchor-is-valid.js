/**
 * @fileoverview anchor-is-valid
 * @author open-wc
 */

const { getAttrVal } = require('../utils/getAttrVal.js');
const { TemplateAnalyzer } = require('../../template-analyzer/template-analyzer.js');
const { generateObjSchema, enumArraySchema } = require('../utils/schemas.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {['noHref', 'invalidHref', 'preferButton']} */
const allAspects = ['noHref', 'invalidHref', 'preferButton'];

const preferButtonErrorMessage =
  'Anchor used as a button. Anchors are primarily expected to navigate. Use the button element instead. Learn more: https://github.com/evcohen/eslint-plugin-jsx-a11y/blob/master/docs/rules/anchor-is-valid.md';

const noHrefErrorMessage =
  'The href attribute is required for an anchor to be keyboard accessible. Provide a valid, navigable address as the href value. If you cannot provide an href, but still need the element to resemble a link, use a button and change it with appropriate styles. Learn more: https://github.com/evcohen/eslint-plugin-jsx-a11y/blob/master/docs/rules/anchor-is-valid.md';

const invalidHrefErrorMessage =
  'The href attribute requires a valid value to be accessible. Provide a valid, navigable address as the href value. If you cannot provide a valid href, but still need the element to resemble a link, use a button and change it with appropriate styles. Learn more: https://github.com/evcohen/eslint-plugin-jsx-a11y/blob/master/docs/rules/anchor-is-valid.md';

const schema = generateObjSchema({
  aspects: enumArraySchema(allAspects, 1),
});

/** @type {import("eslint").Rule.RuleModule} */
const AnchorIsValidRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'anchor-is-valid',
      category: 'Accessibility',
      recommended: false,
    },
    fixable: null,
    schema: [schema],
  },

  create(context) {
    return {
      TaggedTemplateExpression(node) {
        if (isHtmlTaggedTemplate(node)) {
          const analyzer = TemplateAnalyzer.create(node);

          analyzer.traverse({
            enterElement(element) {
              if (element.name === 'a') {
                // Set up the rule aspects to check.
                const options = context.options[0] || {};
                const aspects = options.aspects || allAspects;

                // Create active aspect flag object. Failing checks will only report
                // if the related flag is set to true.
                const activeAspects = allAspects.reduce(
                  (acc, aspect) => ({
                    ...acc,
                    [aspect]: aspects.indexOf(aspect) !== -1,
                  }),
                  { noHref: undefined, invalidHref: undefined, preferButton: undefined },
                );

                const hasAnyHref = Object.keys(element.attribs).includes('href');
                const hasClickListener = Object.keys(element.attribs).includes('@click');

                // When there is no href at all, specific scenarios apply:
                if (!hasAnyHref) {
                  // If no spread operator is found and no click handler is present
                  // it is a link without href.
                  if (
                    activeAspects.noHref &&
                    (!hasClickListener || (hasClickListener && !activeAspects.preferButton))
                  ) {
                    const loc = analyzer.getLocationFor(element);
                    context.report({
                      loc,
                      message: noHrefErrorMessage,
                    });
                  }

                  // If no spread operator is found but a click handler is preset it should be a button.
                  if (hasClickListener && activeAspects.preferButton) {
                    const loc = analyzer.getLocationFor(element);
                    context.report({
                      loc,
                      message: preferButtonErrorMessage,
                    });
                  }
                  return;
                }

                // Hrefs have been found, now check for validity.
                const invalidHrefValues = [getAttrVal(element.attribs.href)].filter(
                  value =>
                    typeof value === 'string' &&
                    (!value.length || value === '#' || /^\W*?javascript:/.test(value)),
                );

                if (invalidHrefValues.length !== 0) {
                  // If a click handler is found it should be a button, otherwise it is an invalid link.
                  if (hasClickListener && activeAspects.preferButton) {
                    const loc = analyzer.getLocationFor(element);
                    context.report({
                      loc,
                      message: preferButtonErrorMessage,
                    });
                  } else if (activeAspects.invalidHref) {
                    const loc = analyzer.getLocationFor(element);
                    context.report({
                      loc,
                      message: invalidHrefErrorMessage,
                    });
                  }
                }
              }
            },
          });
        }
      },
    };
  },
};

module.exports = AnchorIsValidRule;
