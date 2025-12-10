import Hero from '@/components/marketing/Hero';
import HowItWorks from '@/components/marketing/HowItWorks';
import ForParents from '@/components/marketing/ForParents';
import UnderTheHood from '@/components/marketing/UnderTheHood';
import Screenshots from '@/components/marketing/Screenshots';
import FAQ from '@/components/marketing/FAQ';
import Footer from '@/components/marketing/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <HowItWorks />
      <ForParents />
      <UnderTheHood />
      <Screenshots />
      <FAQ />
      <Footer />
    </main>
  );
}
