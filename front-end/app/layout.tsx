import { GoogleTagManager } from "@next/third-parties/google";

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html>
      {process.env.owmf_google_analytics_id && <GoogleTagManager gtmId={process.env.owmf_google_analytics_id} />}
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
