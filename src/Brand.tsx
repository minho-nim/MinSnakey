import logo from "./assets/minsnakey-logo.png?inline";
export default function Brand({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand-lockup ${large ? "brand-lockup-large" : ""}`}>
      <img src={logo} className="brand-logo" alt="" aria-hidden="true" />
      <span className="brand-wordmark">
        Min<span>Snakey</span>
      </span>
    </span>
  );
}
