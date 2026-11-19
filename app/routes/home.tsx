import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta() {
  return [
    { title: "Who Wants To Be A Literature Giant" },
    { name: "description", content: "A Nigerian literature quiz game." },
  ];
}

export function loader() {
  return { message: "A new quiz experience is taking shape." };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome message={loaderData.message} />;
}
