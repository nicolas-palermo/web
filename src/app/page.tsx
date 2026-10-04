import { TechintParticles } from "../components/techint-particles";

const HomePage = () => (
  <main className="bg-background text-foreground">
    <section className="flex min-h-dvh flex-col justify-end px-6 pt-24 pb-16 sm:px-10 sm:pb-20 lg:px-16">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-foreground text-5xl leading-none tracking-tight sm:text-6xl lg:text-7xl">
          Nicolas Palermo
        </h1>
        <p className="text-foreground/70 mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
          ML engineer turned product engineer. Building at Plaude. Previously at
          Techint.
        </p>
      </div>
    </section>

    <section
      aria-labelledby="companies-heading"
      className="border-foreground/10 border-t px-6 py-16 sm:px-10 sm:py-20 lg:px-16"
    >
      <div className="mx-auto w-full max-w-5xl">
        <h2
          className="font-display text-foreground/45 text-sm tracking-widest uppercase"
          id="companies-heading"
        >
          Companies
        </h2>
        <div className="companies-stage mt-10 w-full overflow-hidden">
          <TechintParticles />
        </div>
      </div>
    </section>
  </main>
);

export default HomePage;
