import React, { useState, useEffect } from 'react';
import { Languages } from 'lucide-react';

interface Greeting {
  phrase: string;
  sub: string;
  lang: string;
  code: string;
  gradient: string;
  accentColor: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  badgeGlow: string;
}

const GREETINGS: Greeting[] = [
  {
    phrase: "Bienvenido a la\nBiblioteca\nSan Jerónimo",
    sub: "Facultad de Humanidades y Lenguas Modernas",
    lang: "Español",
    code: "ES",
    gradient: "linear-gradient(135deg, #059669 0%, #0d9488 45%, #0284c7 100%)",
    accentColor: "#059669",
    badgeBg: "#ecfdf5",
    badgeColor: "#065f46",
    badgeBorder: "rgba(5, 150, 105, 0.35)",
    badgeGlow: "rgba(5, 150, 105, 0.15)"
  },
  {
    phrase: "Welcome to the\nSan Jerónimo\nLibrary",
    sub: "Faculty of Humanities and Modern Languages",
    lang: "English",
    code: "EN",
    gradient: "linear-gradient(135deg, #2563eb 0%, #0284c7 50%, #06b6d4 100%)",
    accentColor: "#2563eb",
    badgeBg: "#eff6ff",
    badgeColor: "#1e40af",
    badgeBorder: "rgba(37, 99, 235, 0.35)",
    badgeGlow: "rgba(37, 99, 235, 0.15)"
  },
  {
    phrase: "Bienvenue à la\nBibliothèque\nSan Jerónimo",
    sub: "Faculté des Sciences Humaines et Langues Modernes",
    lang: "Français",
    code: "FR",
    gradient: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)",
    accentColor: "#6366f1",
    badgeBg: "#eef2ff",
    badgeColor: "#4338ca",
    badgeBorder: "rgba(99, 102, 241, 0.35)",
    badgeGlow: "rgba(99, 102, 241, 0.15)"
  },
  {
    phrase: "Willkommen in der\nBibliothek\nSan Jerónimo",
    sub: "Fakultät für Geisteswissenschaften und Moderne Sprachen",
    lang: "Deutsch",
    code: "DE",
    gradient: "linear-gradient(135deg, #0d9488 0%, #d97706 60%, #b45309 100%)",
    accentColor: "#d97706",
    badgeBg: "#fef3c7",
    badgeColor: "#92400e",
    badgeBorder: "rgba(217, 119, 6, 0.35)",
    badgeGlow: "rgba(217, 119, 6, 0.15)"
  },
  {
    phrase: "Benvenuto nella\nBiblioteca\nSan Jerónimo",
    sub: "Facoltà di Scienze Umanistiche e Lingue Moderne",
    lang: "Italiano",
    code: "IT",
    gradient: "linear-gradient(135deg, #059669 0%, #ea580c 50%, #e11d48 100%)",
    accentColor: "#e11d48",
    badgeBg: "#fff1f2",
    badgeColor: "#be123c",
    badgeBorder: "rgba(225, 29, 72, 0.35)",
    badgeGlow: "rgba(225, 29, 72, 0.15)"
  },
  {
    phrase: "欢迎来到\n圣赫罗尼莫\n图书馆",
    sub: "人文与现代语言学院",
    lang: "Chino Mandarín",
    code: "ZH",
    gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #d97706 100%)",
    accentColor: "#dc2626",
    badgeBg: "#fee2e2",
    badgeColor: "#991b1b",
    badgeBorder: "rgba(220, 38, 38, 0.35)",
    badgeGlow: "rgba(220, 38, 38, 0.15)"
  },
  {
    phrase: "Bem-vindo à\nBiblioteca\nSan Jerónimo",
    sub: "Faculdade de Humanidades e Línguas Modernas",
    lang: "Português",
    code: "PT",
    gradient: "linear-gradient(135deg, #0284c7 0%, #059669 50%, #10b981 100%)",
    accentColor: "#059669",
    badgeBg: "#ecfdf5",
    badgeColor: "#065f46",
    badgeBorder: "rgba(5, 150, 105, 0.35)",
    badgeGlow: "rgba(5, 150, 105, 0.15)"
  },
];

export const RotatingGreeting: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const current = GREETINGS[index];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (isFading) {
      timer = setTimeout(() => {
        setIndex((prev) => (prev + 1) % GREETINGS.length);
        setCharIndex(0);
        setIsFading(false);
      }, 650);
    } else {
      if (charIndex < current.phrase.length) {
        const nextChar = current.phrase[charIndex];
        const isCJK = /[\u4e00-\u9fa5]/.test(nextChar);
        const speed = isCJK ? 130 : 52 + Math.random() * 18;

        timer = setTimeout(() => {
          setCharIndex((prev) => prev + 1);
        }, speed);
      } else {
        timer = setTimeout(() => {
          setIsFading(true);
        }, 4200);
      }
    }

    return () => clearTimeout(timer);
  }, [charIndex, isFading, index, current.phrase]);

  const displayedPhrase = current.phrase.slice(0, charIndex);
  const typedLines = displayedPhrase.split('\n');
  const activeLineIndex = typedLines.length - 1;

  return (
    <div style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', textAlign: 'right' }}>
      <div 
        style={{ 
          opacity: isFading ? 0 : 1,
          filter: isFading ? 'blur(4px)' : 'blur(0px)',
          transform: isFading ? 'translateY(-6px)' : 'translateY(0)',
          transition: 'opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1), filter 0.65s ease, transform 0.65s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          width: '100%'
        }}
      >
        {/* Language Badge (Right-aligned next to card) */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginBottom: '14px' }}>
          <span 
            style={{ 
              fontSize: '0.75rem', 
              fontWeight: 800, 
              letterSpacing: '0.8px',
              background: current.badgeBg, 
              color: current.badgeColor,
              padding: '4px 10px',
              borderRadius: '8px',
              border: `1.5px solid ${current.badgeBorder}`,
              boxShadow: `0 2px 10px ${current.badgeGlow}`,
              transition: 'all 0.4s ease'
            }}
          >
            {current.code}
          </span>
          <span 
            className="badge-tag" 
            style={{ 
              background: current.badgeBg, 
              color: current.badgeColor, 
              border: `1.5px solid ${current.badgeBorder}`,
              boxShadow: `0 2px 10px ${current.badgeGlow}`,
              fontSize: '0.82rem',
              fontWeight: 700,
              transition: 'all 0.4s ease'
            }}
          >
            <Languages size={14} /> {current.lang}
          </span>
        </div>

        {/* Typewritten Title (Right-aligned next to card) */}
        <h1 
          className="font-display" 
          style={{ 
            fontSize: 'clamp(2.3rem, 4.1vw, 3.65rem)', 
            fontWeight: 800, 
            lineHeight: 1.15,
            marginBottom: '14px',
            minHeight: '3.55em',
            filter: 'drop-shadow(0 2px 10px rgba(255, 255, 255, 0.95))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            textAlign: 'right',
            letterSpacing: '-0.5px'
          }}
        >
          {typedLines.map((lineText, idx) => {
            const isFirst = idx === 0;
            const isCurrentActive = idx === activeLineIndex;

            return (
              <div 
                key={idx}
                style={{ 
                  marginTop: isFirst ? '0px' : '2px', 
                  textAlign: 'right', 
                  width: '100%',
                  whiteSpace: 'nowrap'
                }}
              >
                <span 
                  style={
                    isFirst
                      ? { color: '#0f172a' }
                      : { 
                          background: current.gradient,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          fontWeight: 850
                        }
                  }
                >
                  {lineText}
                </span>

                {isCurrentActive && (
                  <span 
                    className="typewriter-cursor"
                    style={{
                      display: 'inline-block',
                      width: '3.5px',
                      height: '0.82em',
                      marginLeft: '6px',
                      backgroundColor: current.accentColor,
                      borderRadius: '2px',
                      verticalAlign: 'baseline',
                      opacity: isFading ? 0 : 1,
                      transition: 'background-color 0.3s ease'
                    }}
                  />
                )}
              </div>
            );
          })}
        </h1>

        {/* Subtitle with accent marker (Right-aligned next to card) */}
        <p 
          style={{ 
            color: '#475569', 
            fontSize: '1.14rem', 
            fontWeight: 600,
            opacity: charIndex > 0 ? 1 : 0,
            transition: 'opacity 0.4s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <span 
            style={{ 
              width: '24px', 
              height: '3px', 
              background: current.accentColor, 
              borderRadius: '3px', 
              display: 'inline-block', 
              transition: 'background-color 0.4s ease' 
            }} 
          />
          <span>{current.sub}</span>
        </p>
      </div>
    </div>
  );
};
