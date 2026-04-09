import "./globals.css";


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-800">

        <div className="flex min-h-screen">


          {/* Main */}
          <div className="flex-1 flex flex-col">


            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>

          </div>

        </div>

      </body>
    </html>
  );
}