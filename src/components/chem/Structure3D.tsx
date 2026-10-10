import { useEffect, useRef, useState } from "react";
import { getSdf } from "@/lib/pubchem";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";

type Style = "ballstick" | "stick" | "sphere";

export function Structure3D({ cid, height = 320 }: { cid: number; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewer = useRef<any>(null);
  const [state, setState] = useState<"loading" | "ok" | "flat" | "none">("loading");
  const [style, setStyle] = useState<Style>("ballstick");
  const [spin, setSpin] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    (async () => {
      const [mol, data] = await Promise.all([import("3dmol"), getSdf(cid)]);
      if (cancelled || !ref.current) return;
      if (!data) return setState("none");
      ref.current.innerHTML = "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const $3D: any = (mol as any).default ?? mol;
      const v = $3D.createViewer(ref.current, { backgroundAlpha: 0, antialias: true });
      v.addModel(data.sdf, "sdf");
      viewer.current = v;
      applyStyle(v, "ballstick");
      v.zoomTo();
      v.spin("y", 0.6);
      v.render();
      setState(data.is3d ? "ok" : "flat");
    })().catch(() => !cancelled && setState("none"));
    return () => {
      cancelled = true;
      viewer.current?.clear?.();
    };
  }, [cid]);

  useEffect(() => {
    if (!viewer.current) return;
    applyStyle(viewer.current, style);
    viewer.current.render();
  }, [style]);

  useEffect(() => {
    viewer.current?.spin(spin ? "y" : false, 0.6);
  }, [spin]);

  return (
    <div className="relative">
      <div ref={ref} className="relative w-full cursor-grab active:cursor-grabbing" style={{ height }} />
      {state === "loading" && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Loading 3D conformer…</div>}
      {state === "none" && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No 3D structure available</div>}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
        {(["ballstick", "stick", "sphere"] as Style[]).map((s) => (
          <Button key={s} size="sm" variant={style === s ? "neon" : "glass"} onClick={() => setStyle(s)} className="h-7 px-2 text-xs">
            {s === "ballstick" ? "Ball & stick" : s === "stick" ? "Stick" : "Space-fill"}
          </Button>
        ))}
        <Button size="sm" variant={spin ? "neon" : "glass"} onClick={() => setSpin(!spin)} className="h-7 px-2 text-xs" aria-label="Toggle rotation">
          <RotateCw className="size-3" />
        </Button>
      </div>
      {state === "flat" && <span className="absolute right-2 top-2 text-xs text-muted-foreground">2D coordinates only</span>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyStyle(v: any, s: Style) {
  if (s === "ballstick") v.setStyle({}, { stick: { radius: 0.14, colorscheme: "Jmol" }, sphere: { scale: 0.28, colorscheme: "Jmol" } });
  if (s === "stick") v.setStyle({}, { stick: { radius: 0.2, colorscheme: "Jmol" } });
  if (s === "sphere") v.setStyle({}, { sphere: { colorscheme: "Jmol" } });
}
