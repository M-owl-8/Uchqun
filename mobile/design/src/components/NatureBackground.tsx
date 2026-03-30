import { ImageWithFallback } from './figma/ImageWithFallback';

export function NatureBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Nature background image with overlay */}
      <div className="absolute inset-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1742211183192-cd1971b95385?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2Z0JTIwbmF0dXJlJTIwYmFja2dyb3VuZCUyMGNoaWxkcmVuJTIwcGVhY2VmdWx8ZW58MXx8fHwxNzcwMTkxMTE2fDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Peaceful nature background"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F4EDE2]/95 via-[#F4EDE2]/90 to-[#F4EDE2]/95" />
      </div>

      {/* Floating decorative blurred shapes */}
      {/* Mint blob - top left */}
      <div
        className="absolute top-0 -left-20 w-80 h-80 rounded-full opacity-30 animate-float"
        style={{
          background: 'radial-gradient(circle, #DFF4EC 0%, transparent 70%)',
          filter: 'blur(60px)',
          animationDelay: '0s',
        }}
      />

      {/* Powder Blue blob - top right */}
      <div
        className="absolute -top-10 -right-20 w-96 h-96 rounded-full opacity-25 animate-float"
        style={{
          background: 'radial-gradient(circle, #BFD7EA 0%, transparent 70%)',
          filter: 'blur(70px)',
          animationDelay: '2s',
          animationDuration: '8s',
        }}
      />

      {/* Blush Peach blob - middle left */}
      <div
        className="absolute top-1/3 -left-32 w-72 h-72 rounded-full opacity-20 animate-float"
        style={{
          background: 'radial-gradient(circle, #F8D7C4 0%, transparent 70%)',
          filter: 'blur(65px)',
          animationDelay: '3s',
          animationDuration: '10s',
        }}
      />

      {/* Honey Gold blob - middle right */}
      <div
        className="absolute top-1/2 -right-24 w-64 h-64 rounded-full opacity-25 animate-float"
        style={{
          background: 'radial-gradient(circle, #E8C27E 0%, transparent 70%)',
          filter: 'blur(55px)',
          animationDelay: '1s',
          animationDuration: '7s',
        }}
      />

      {/* Mint blob - bottom left */}
      <div
        className="absolute bottom-20 -left-28 w-96 h-96 rounded-full opacity-20 animate-float"
        style={{
          background: 'radial-gradient(circle, #DFF4EC 0%, transparent 70%)',
          filter: 'blur(75px)',
          animationDelay: '4s',
          animationDuration: '9s',
        }}
      />

      {/* Powder Blue blob - bottom right */}
      <div
        className="absolute -bottom-32 right-10 w-80 h-80 rounded-full opacity-30 animate-float"
        style={{
          background: 'radial-gradient(circle, #BFD7EA 0%, transparent 70%)',
          filter: 'blur(65px)',
          animationDelay: '2.5s',
          animationDuration: '11s',
        }}
      />

      {/* Soft Navy accent - center */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full opacity-10 animate-float"
        style={{
          background: 'radial-gradient(circle, #2E3A59 0%, transparent 70%)',
          filter: 'blur(50px)',
          animationDelay: '5s',
          animationDuration: '12s',
        }}
      />

      {/* Nature accent images - subtle overlays */}
      <div className="absolute top-10 right-10 opacity-5 animate-float" style={{ animationDuration: '15s' }}>
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1763098844661-dc9ed07f3e00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnZW50bGUlMjBncmVlbiUyMGxlYXZlcyUyMG5hdHVyYWwlMjBsaWdodHxlbnwxfHx8fDE3NzAxOTExMTd8MA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Leaves decoration"
          className="w-48 h-48 object-cover rounded-full"
          style={{ filter: 'blur(8px)' }}
        />
      </div>

      <div className="absolute bottom-32 left-10 opacity-5 animate-float" style={{ animationDuration: '13s', animationDelay: '3s' }}>
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1769184614148-b24ac44feeab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXN0ZWwlMjBza3klMjBjbG91ZHMlMjBzZXJlbmV8ZW58MXx8fHwxNzcwMTkxMTE3fDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Sky decoration"
          className="w-56 h-56 object-cover rounded-full"
          style={{ filter: 'blur(10px)' }}
        />
      </div>
    </div>
  );
}
