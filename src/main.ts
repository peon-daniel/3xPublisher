import "./styles.css";
import { formatShellTitle } from "./core/smoke";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root #app not found");
}

app.innerHTML = `
  <main class="shell">
    <h1>${formatShellTitle("3xPublisher")}</h1>
    <p>Phase 1 scaffold is ready. Product features begin in later phases.</p>
  </main>
`;
