import React from 'react';
import {
  Info,
  Sparkles,
  Award,
  Globe,
  Mail,
  MapPin,
  HeartHandshake,
  CheckCircle2
} from 'lucide-react';

export const AcercaSection: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#161920] via-[#1a231f] to-[#161920] border border-white/10 p-8 md:p-10">
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#6ee7b7] uppercase tracking-wider">
            <span>13. Contexto Institucional</span>
            <span>•</span>
            <span>Compañía & Productora</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight font-display">
            ATHA Producciones
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Productora y plataforma creativa chilena dedicada a la investigación, creación, gestión y circulación de obras de artes escénicas (teatro, danza contemporánea), música en vivo y festivales independientes en el territorio nacional e internacional.
          </p>
        </div>
      </div>

      {/* 3 Pillars: Misión, Visión, Enfoque */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="p-6 rounded-2xl bg-[#161920] border border-white/10 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#6ee7b7]/15 text-[#6ee7b7] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Nuestra Misión</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Impulsar creaciones escénicas de alto rigor estético y dramatúrgico, generando puentes sostenibles entre los creadores, los espacios escénicos y las diversas audiencias de Chile, descentralizando el acceso a las artes vivas.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#161920] border border-white/10 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#fbbf24]/15 text-[#fbbf24] flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Nuestra Visión</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Consolidarnos como un referente latinoamericano en producción escénica sustentable e I+D artístico, articulando nuevos formatos inmersivos, tecnología sonora de punta y redes de circulación colaborativas.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#161920] border border-white/10 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/15 text-[#38bdf8] flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Principios de Trabajo</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Trato laboral ético y transparente hacia elencos y técnicos, paridad y equidad de género, cuidado ecológico de materiales escenográficos y búsqueda incesante de lenguajes contemporáneos.
          </p>
        </div>

      </div>

      {/* History & Trajectory */}
      <div className="p-8 rounded-2xl bg-[#161920] border border-white/10 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Historia & Trayectoria de ATHA</span>
        </h2>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Fundada en Santiago de Chile por cuatro profesionales provenientes de la dirección teatral, la coreografía, la ingeniería de iluminación y la composición sonora, <strong>ATHA Producciones</strong> nació como respuesta a la necesidad de profesionalizar los procesos de producción y circulación de artes vivas con un modelo autónomo e interdisciplinar.
          </p>
          <p>
            A lo largo de sus temporadas, ATHA ha estrenado montajes aclamados por la crítica como <em>"La Memoria del Agua"</em>, <em>"Cuerpos Fracturados"</em>, el ciclo de música de cámara <em>"ATHA Sessions"</em> y el aclamado festival <em>"Festival Ondas Escénicas"</em>. La productora mantiene alianzas activas con el Centro GAM, Matucana 100, Teatro Biobío, Teatro Municipal de Valparaíso y festivales de artes escénicas en todo el Cono Sur.
          </p>
        </div>
      </div>

      {/* Official Contact & Legal Info */}
      <div className="p-6 rounded-2xl bg-[#12141a] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 text-xs text-slate-400">
        <div>
          <span className="text-white font-semibold block text-sm">ATHA Producciones SpA</span>
          <span>RUT: 76.892.410-K • Santiago & Valparaíso, Chile</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-[#6ee7b7]" />
            <a href="mailto:contacto@athaproducciones.cl" className="hover:text-white">
              contacto@athaproducciones.cl
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-[#38bdf8]" />
            <span>www.athaproducciones.cl</span>
          </div>
        </div>
      </div>

    </div>
  );
};
