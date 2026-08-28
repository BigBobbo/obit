import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Interpolating a caller-supplied value into a PostgREST filter string is
      // the bug that made memorial pages enumerable. Filter strings are not
      // parameterised — use eq()/in(), or findPageByRef() for page lookups.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='or'] > TemplateLiteral[expressions.length>0]",
          message:
            "Do not interpolate values into a PostgREST or() filter — filter strings are not parameterised. Use eq() lookups, or findPageByRef() for pages.",
        },
      ],
    },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default config;
