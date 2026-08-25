import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-black mb-6">이용약관</h1>
        <p className="text-sm text-muted">추후 작성 예정입니다.</p>
      </main>
      <Footer />
    </div>
  );
}
