import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = process.cwd();

function source(file: string) {
  return readFileSync(path.join(root, file), "utf8");
}

function themeBootstrap() {
  const layout = source("app/layout.tsx");
  const match = layout.match(/__html:\s*`([\s\S]*?)`,\s*\n\s*}}/);
  assert.ok(match, "RootLayout must expose one literal theme bootstrap");
  return match[1];
}

function executeThemeBootstrap({
  storedTheme,
  systemDark,
  storageThrows = false,
}: {
  storedTheme: string | null;
  systemDark: boolean;
  storageThrows?: boolean;
}) {
  let dark = false;
  const metadata = new Map<string, string>();
  const storageWrites: Array<[string, string]> = [];
  const localStorage = {
    getItem() {
      if (storageThrows) throw new Error("storage unavailable");
      return storedTheme;
    },
    setItem(key: string, value: string) {
      if (storageThrows) throw new Error("storage unavailable");
      storageWrites.push([key, value]);
    },
  };
  const documentElement = {
    classList: {
      toggle(_name: string, force: boolean) {
        dark = force;
      },
    },
  };
  const document = {
    documentElement,
    querySelector(selector: string) {
      return {
        setAttribute(name: string, value: string) {
          metadata.set(`${selector}:${name}`, value);
        },
      };
    },
  };

  vm.runInNewContext(themeBootstrap(), {
    document,
    localStorage,
    window: { matchMedia: () => ({ matches: systemDark }) },
  });

  return { dark, metadata, storageWrites };
}

test("runs exactly one executable theme bootstrap without next-themes' serialized helper", () => {
  const provider = source("components/theme-provider.tsx");
  const layout = source("app/layout.tsx");

  assert.match(layout, /id="theme-bootstrap"/);
  assert.match(layout, /data-theme-bootstrap="executable"/);
  assert.match(provider, /type:\s*"application\/json"/);
  assert.match(provider, /"data-theme-bootstrap":\s*"inert-next-themes"/);
  assert.doesNotMatch(themeBootstrap(), /\be\(C,\s*["']k2["']/);

  const result = executeThemeBootstrap({ storedTheme: "dark", systemDark: false });
  assert.equal(result.dark, true);
  assert.deepEqual(result.storageWrites, [["theme", "dark"]]);
  assert.equal(
    result.metadata.get(`meta[name='color-scheme']:content`),
    "dark light",
  );
  assert.equal(
    result.metadata.get(`meta[name='theme-color']:content`),
    "#171411",
  );
});

test("theme bootstrap falls back to the system theme when storage is unavailable", () => {
  const result = executeThemeBootstrap({
    storedTheme: null,
    systemDark: true,
    storageThrows: true,
  });
  assert.equal(result.dark, true);
  assert.deepEqual(result.storageWrites, []);
  assert.equal(
    result.metadata.get(`meta[name='color-scheme']:content`),
    "dark light",
  );
});

test("decorative WebGL effects preserve their CSS fallback when contexts fail", () => {
  for (const file of [
    "components/site/light-rays.tsx",
    "components/site/music-light-rays.tsx",
  ]) {
    const component = source(file);
    const renderer = component.indexOf("new Renderer(");
    const guardedBlock = component.lastIndexOf("try {", renderer);

    assert.ok(renderer > 0, `${file} must create the production OGL renderer`);
    assert.ok(guardedBlock > 0, `${file} must guard OGL construction`);
    assert.match(component, /canvas\.getContext\("webgl2", contextAttributes\)/);
    assert.match(component, /canvas\.getContext\("webgl", contextAttributes\)/);
    assert.match(component, /new Renderer\(\{\s*canvas,/);
    assert.match(component, /webgl:\s*webgl2 \? 2 : 1/);
    assert.match(component, /host\.dataset\.webglUnavailable\s*=\s*"true"/);
    assert.match(component, /if \(!\w+\) \{\s*disableWebGL\(\);\s*return dispose;/);
    assert.match(component, /const render = \(\) => \{[\s\S]*?try \{[\s\S]*?renderer\.render\([\s\S]*?catch \{\s*disableWebGL\(\);/);
    assert.match(component, /catch \{\s*disableWebGL\(\);\s*}\s*\n\s*return dispose;/);
  }
});
