// Esecuzione in Node: node --test tests/physics.test.js
import { test } from "node:test";
import { cases } from "./physics.cases.js";

for (const c of cases) test(c.name, () => c.run());
