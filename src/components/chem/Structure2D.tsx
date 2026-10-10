import { useEffect, useRef, useState } from "react";

export function Structure2D({ smiles, height = 280, className }: { smiles: string; height?: number; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setErr(false);
    if (!smiles || !ref.current) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await import("smiles-drawer");
      const SD = mod.default ?? mod;
      if (cancelled || !ref.current) return;
      const svg = ref.current;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const w = svg.clientWidth || 400;
      const drawer = new SD.SvgDrawer({ width: w, height, bondThickness: 1.4, padding: 16, compactDrawing: false });
      SD.parse(
        smiles,
        (tree: unknown) => {
          try {
            drawer.draw(tree, svg, "dark");
          } catch {
            setErr(true);
          }
        },
        () => setErr(true),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [smiles, height]);

  return (
    <div className={className}>
      {err ? (
        <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
          Structure could not be drawn
        </div>
      ) : (
        <svg ref={ref} style={{ width: "100%", height }} />
      )}
    </div>
  );
}
