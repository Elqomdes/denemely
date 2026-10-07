import type { SVGProps } from "react";

type IkonProps = SVGProps<SVGSVGElement>;

function IkonCercevesi({ children, ...props }: IkonProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function GenelBakisIkonu(props: IkonProps) {
  return (
    <IkonCercevesi {...props}>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </IkonCercevesi>
  );
}

export function DenemeIkonu(props: IkonProps) {
  return (
    <IkonCercevesi {...props}>
      <path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </IkonCercevesi>
  );
}

export function OgrenciIkonu(props: IkonProps) {
  return (
    <IkonCercevesi {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M16 11a4 4 0 0 1 0 8M19 8a3 3 0 0 1 0 6" />
    </IkonCercevesi>
  );
}

export function KurumIkonu(props: IkonProps) {
  return (
    <IkonCercevesi {...props}>
      <path d="m3 10 9-6 9 6M5 10v9M9 10v9M15 10v9M19 10v9M3 20h18" />
    </IkonCercevesi>
  );
}

export function YukleIkonu(props: IkonProps) {
  return (
    <IkonCercevesi {...props}>
      <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
    </IkonCercevesi>
  );
}

export function CikisIkonu(props: IkonProps) {
  return (
    <IkonCercevesi {...props}>
      <path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
    </IkonCercevesi>
  );
}

export function OkIkonu(props: IkonProps) {
  return (
    <IkonCercevesi {...props}>
      <path d="m9 18 6-6-6-6" />
    </IkonCercevesi>
  );
}

export function GrafikIkonu(props: IkonProps) {
  return (
    <IkonCercevesi {...props}>
      <path d="M3 3v18h18M7 16l4-5 3 3 5-7" />
    </IkonCercevesi>
  );
}
