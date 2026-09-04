export interface Project {
  id: number;
  titulo: string;
  categoria: string;
  disciplina: string;
  formato: string;
  ano: number;
  compania: string;
  direccion: string;
  produccion: string;
  elenco: string;
  duracion: string;
  publico: string;
  estado: string;
  destacado: boolean;
  imagen: string;
  descripcion: string;
}

export interface Socio {
  id: number;
  nombre: string;
  rol: string;
  bio: string;
  imagen: string;
}

export const socios: Socio[] = [
  {
    id: 1,
    nombre: "Francisco Pérez",
    rol: "Director Artístico",
    bio: "Director y dramaturgo con más de 15 años de experiencia en teatro contemporáneo chileno.",
    imagen: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
  },
  {
    id: 2,
    nombre: "Jesús Urqueta",
    rol: "Director de Escena",
    bio: "Especialista en dirección escénica y gestión de proyectos culturales de gran formato.",
    imagen: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
  },
  {
    id: 3,
    nombre: "Josefa Schultz",
    rol: "Actriz / Productora",
    bio: "Actriz formada en la U. de Chile, especialista en teatro físico y performance contemporánea.",
    imagen: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
  },
  {
    id: 4,
    nombre: "Karla Meriño",
    rol: "Gestión Cultural",
    bio: "Gestora cultural con experiencia en postulaciones a fondos públicos y privados nacionales.",
    imagen: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
  },
];

export const proyectos: Project[] = [
  {
    id: 1,
    titulo: "Todo acuerdo escrito es una mentira",
    categoria: "Teatro",
    disciplina: "Teatro Contemporáneo",
    formato: "Obra Escénica",
    ano: 2024,
    compania: "Compañía Proyecto TAEM",
    direccion: "Jesús Urqueta / Francisco Pérez",
    produccion: "ATHA Producciones",
    elenco: "Josefa Schultz, Karla Meriño, Adrián Díaz",
    duracion: "75 min",
    publico: "+14 años",
    estado: "En circulación",
    destacado: true,
    imagen: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80",
    descripcion:
      "Distopía chilena situada en el año 2079 donde los contratos han sido abolidos. Tres personajes navegan un mundo sin promesas formales, explorando la confianza y el poder en el lenguaje.",
  },
  {
    id: 2,
    titulo: "Cuerpos en Tránsito",
    categoria: "Danza",
    disciplina: "Danza Contemporánea",
    formato: "Performance",
    ano: 2024,
    compania: "ATHA Producciones",
    direccion: "Francisco Pérez",
    produccion: "ATHA Producciones",
    elenco: "Colectivo de Danza ATHA",
    duracion: "60 min",
    publico: "+12 años",
    estado: "En circulación",
    destacado: true,
    imagen: "https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80",
    descripcion:
      "Investigación coreográfica sobre la migración y el desplazamiento. Ocho intérpretes construyen una ciudad efímera que se derrumba y reconstruye en tiempo real.",
  },
  {
    id: 3,
    titulo: "El Archivo de los Olvidados",
    categoria: "Teatro",
    disciplina: "Teatro Documental",
    formato: "Obra Escénica",
    ano: 2023,
    compania: "Compañía Archivo",
    direccion: "Jesús Urqueta",
    produccion: "ATHA Producciones",
    elenco: "Josefa Schultz, Pedro Montt, Ana Lira",
    duracion: "90 min",
    publico: "+16 años",
    estado: "Temporada cerrada",
    destacado: false,
    imagen: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80",
    descripcion:
      "Pieza documental construida a partir de testimonios reales de familias afectadas por la dictadura. El escenario es un archivo vivo que se ordena y desordena durante la obra.",
  },
  {
    id: 4,
    titulo: "Sonata para Objetos Rotos",
    categoria: "Teatro",
    disciplina: "Teatro de Objetos",
    formato: "Obra Escénica",
    ano: 2023,
    compania: "La Máquina",
    direccion: "Francisco Pérez",
    produccion: "ATHA Producciones",
    elenco: "Karla Meriño, Rodrigo Aste",
    duracion: "50 min",
    publico: "Todo público",
    estado: "Itinerante",
    destacado: false,
    imagen: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80",
    descripcion:
      "Espectáculo de teatro de objetos donde electrodomésticos en desuso se convierten en instrumentos de una orquesta fallida. Una oda a lo que no funciona pero persiste.",
  },
  {
    id: 5,
    titulo: "Mujeres que Miran el Mar",
    categoria: "Teatro",
    disciplina: "Teatro Feminista",
    formato: "Obra Escénica",
    ano: 2023,
    compania: "Colectivo Orilla",
    direccion: "Josefa Schultz",
    produccion: "ATHA Producciones",
    elenco: "Josefa Schultz, Karla Meriño, Valentina Trigo",
    duracion: "70 min",
    publico: "+14 años",
    estado: "En circulación",
    destacado: true,
    imagen: "https://images.unsplash.com/photo-1519120944692-1a8d8cfc107f?w=800&q=80",
    descripcion:
      "Tres mujeres en distintos puntos de la costa chilena esperan noticias del mar. Obra coral sobre la espera, la memoria y la resistencia femenina en zonas portuarias.",
  },
  {
    id: 6,
    titulo: "Ciclo de Lecturas Dramatizadas",
    categoria: "Literatura",
    disciplina: "Lectura Dramatizada",
    formato: "Ciclo / Serie",
    ano: 2023,
    compania: "ATHA Producciones",
    direccion: "Francisco Pérez",
    produccion: "ATHA Producciones",
    elenco: "Elenco variable",
    duracion: "45 min c/u",
    publico: "+16 años",
    estado: "Programación continua",
    destacado: false,
    imagen: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
    descripcion:
      "Serie mensual de lecturas dramatizadas de dramaturgia latinoamericana contemporánea. Cada sesión convoca a un dramaturgo diferente y abre espacio al diálogo con el público.",
  },
  {
    id: 7,
    titulo: "La Sala de las Máquinas",
    categoria: "Teatro",
    disciplina: "Teatro Industrial",
    formato: "Site Specific",
    ano: 2022,
    compania: "ATHA Producciones",
    direccion: "Jesús Urqueta",
    produccion: "ATHA Producciones",
    elenco: "Pedro Montt, Ana Lira, Rodrigo Aste, Tamara Vidal",
    duracion: "80 min",
    publico: "+14 años",
    estado: "Temporada cerrada",
    destacado: false,
    imagen: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=800&q=80",
    descripcion:
      "Obra site specific en la ex Fábrica Textil Yodai. El espacio industrial deviene teatro: el ruido de las máquinas, el polvo y los cuerpos obreros conviven con el texto dramático.",
  },
  {
    id: 8,
    titulo: "Dossier Artístico · Felipe Naranjo",
    categoria: "Gestión",
    disciplina: "Empaquetamiento Artístico",
    formato: "Servicio / Producto",
    ano: 2024,
    compania: "ATHA Producciones",
    direccion: "ATHAMU Pipeline A",
    produccion: "ATHA Producciones",
    elenco: "—",
    duracion: "—",
    publico: "Industria",
    estado: "Entregado",
    destacado: false,
    imagen: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&q=80",
    descripcion:
      "Dossier artístico en formato PDF cinematográfico generado con el pipeline ATHAMU. Incluye sinopsis, ficha técnica, imágenes de producción y carta de difusión.",
  },
  {
    id: 9,
    titulo: "Réquiem para un País",
    categoria: "Música",
    disciplina: "Música en Vivo / Teatro",
    formato: "Obra Escénica",
    ano: 2022,
    compania: "Compañía ATHA / Ensamble Acústico",
    direccion: "Francisco Pérez",
    produccion: "ATHA Producciones",
    elenco: "Ensamble de cuerdas + Josefa Schultz",
    duracion: "65 min",
    publico: "+12 años",
    estado: "Temporada cerrada",
    destacado: true,
    imagen: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
    descripcion:
      "Performance musical-teatral para cuarteto de cuerdas y actriz. La música en vivo narra la historia de un país imaginario que colapsa lentamente mientras su gente canta.",
  },
  {
    id: 10,
    titulo: "Taller de Creación Colectiva",
    categoria: "Formación",
    disciplina: "Pedagogía Teatral",
    formato: "Taller / Formación",
    ano: 2024,
    compania: "ATHA Producciones",
    direccion: "Josefa Schultz / Karla Meriño",
    produccion: "ATHA Producciones",
    elenco: "Participantes de la comunidad",
    duracion: "3 meses",
    publico: "+18 años",
    estado: "En curso",
    destacado: false,
    imagen: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
    descripcion:
      "Proceso de creación colectiva con comunidades no artísticas. El taller explora metodologías de teatro aplicado para construir relatos propios desde la experiencia cotidiana.",
  },
  {
    id: 11,
    titulo: "Festival de Artes Escénicas ATHA",
    categoria: "Festival",
    disciplina: "Artes Escénicas",
    formato: "Festival / Evento",
    ano: 2024,
    compania: "ATHA Producciones",
    direccion: "Francisco Pérez / Jesús Urqueta",
    produccion: "ATHA Producciones",
    elenco: "Compañías invitadas nacionales e internacionales",
    duracion: "5 días",
    publico: "Todo público",
    estado: "Convocatoria abierta",
    destacado: true,
    imagen: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80",
    descripcion:
      "Primera edición del Festival ATHA: cinco días de obras, talleres y conversaciones sobre artes escénicas contemporáneas en Chile. Plataforma de encuentro para creadores y públicos.",
  },
];

export const stats = [
  { label: "Proyectos", value: "11", sub: "activos o en circulación" },
  { label: "Años", value: "8+", sub: "de trayectoria" },
  { label: "Montajes", value: "23", sub: "estrenados" },
];

export const drawerLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Perfil", href: "#perfil" },
  { label: "Socios", href: "#socios" },
  { label: "Proyectos", href: "#proyectos" },
  { label: "Contacto", href: "#contacto" },
];
