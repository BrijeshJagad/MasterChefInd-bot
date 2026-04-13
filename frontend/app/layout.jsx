import ThemeRegistry from "./ThemeRegistry";

export const metadata = {
  title: "MasterChef Menu 👨‍🍳",
  description: "Production-grade Canteen Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
