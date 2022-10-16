import { A } from '@patched/hookrouter';

export default function NavBar() {
  return (
    <div className="nav-bar">
      <A href="/"><i className="fab fa-empire" /></A>
      <A href="/films/">Films</A>
      <A href="/people/">Characters</A>
      <A href="/planets/">Planets</A>
      <A href="/species/">Species</A>
      <A href="/vehicles/">Vehicles</A>
      <A href="/starships/">Starships</A>
    </div>
  );
}
