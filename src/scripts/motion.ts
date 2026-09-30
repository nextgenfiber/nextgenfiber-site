// Site-wide motion: smooth scroll, line-by-line heading reveals, image mask
// reveals and a light parallax. Everything sits inside one matchMedia block,
// so visitors who ask for reduced motion get the static page.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const mm = gsap.matchMedia();

mm.add('(prefers-reduced-motion: no-preference)', () => {
  const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  // Headings rise line by line from behind a mask, once.
  document.fonts.ready.then(() => {
    document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit: (self) => {
          // Give descenders room inside each line mask.
          self.masks.forEach((m) => { (m as HTMLElement).style.paddingBottom = '0.16em'; (m as HTMLElement).style.marginBottom = '-0.16em'; });
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: 1.1,
            ease: 'expo.out',
            stagger: 0.09,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });
        },
      });
    });
    ScrollTrigger.refresh();
  });

  // Photos open from a slightly inset mask.
  gsap.utils.toArray<HTMLElement>('[data-clip]').forEach((el) => {
    gsap.fromTo(
      el,
      { clipPath: 'inset(10% 6% 10% 6% round 2px)' },
      {
        clipPath: 'inset(0% 0% 0% 0% round 2px)',
        duration: 1.3,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      },
    );
  });

  // Large photos drift a little against the scroll.
  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((wrap) => {
    const img = wrap.querySelector('img');
    if (!img) return;
    gsap.fromTo(img, { yPercent: -7 }, {
      yPercent: 7,
      ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
});
