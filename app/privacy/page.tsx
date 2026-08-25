import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-black mb-6">개인정보처리방침</h1>
        <p className="text-sm text-muted">
          OAuth 액세스 토큰은 암호화되어 저장되며, 게시 목적 외에는 사용하거나 제3자에게 제공하지 않습니다.
          연동 해제 시 즉시 삭제됩니다.
        </p>
      </main>
      <Footer />
    </div>
  );
}
