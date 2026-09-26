import React, { useState, useEffect } from 'react';
import { Languages } from 'lucide-react';

interface Greeting {
  phrase: string;
  sub: string;
  lang: string;
  code: string;
}

const GREETINGS: Greeting[] = [
  { phrase: "Bienvenido a la\nBiblioteca San Jerónimo", sub: "Facultad de Humanidades y Lenguas Modernas", lang: "Español", code: "ES" },
  { phrase: "Welcome to the\nSan Jerónimo Library", sub: "Faculty of Humanities and Modern Languages", lang: "English", code: "EN" },
  { phrase: "Bienvenue à la\nBibliothèque San Jerónimo", sub: "Faculté des Sciences Humaines et Langues Modernes", lang: "Français", code: "FR" },
  { phrase: "Willkommen in der\nBibliothek San Jerónimo", sub: "Fakultät für Geisteswissenschaften und Moderne Sprachen", lang: "Deutsch", code: "DE" },
  { phrase: "Benvenuto nella\nBiblioteca San Jerónimo", sub: "Facoltà di Scienze Umanistiche e Lingue Moderne", lang: "Italiano", code: "IT" },
  { phrase: "欢迎来到圣赫罗尼莫图书馆", sub: "人文与现代语言学院", lang: "Chino Mandarín", code: "ZH" },
  { phrase: "Bem-vindo à\nBiblioteca San Jerónimo", sub: "Faculdade de Humanidades e Línguas Modernas", lang: "Português", code: "PT" },
];

export const RotatingGreeting: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const current = GREETINGS[index];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (isFading) {
      // Fade out duration: 650ms, then advance to next language and restart typing
      timer = setTimeout(() => {
        setIndex((prev) => (prev + 1) % GREETINGS.length);
        setCharIndex(0);
        setIsFading(false);
      }, 650);
    } else {
      if (charIndex < current.phrase.length) {
        // Typing phase: type next character with human cadence
        const nextChar = current.phrase[charIndex];
        const isCJK = /[\u4e00-\u9fa5]/.test(nextChar);
        const speed = isCJK ? 130 : 52 + Math.random() * 18;

        timer = setTimeout(() => {
          setCharIndex((prev) => prev + 1);
        }, speed);
      } else {
        // Completed typing: hold for 2600ms so visitors can comfortably read it
        timer = setTimeout(() => {
          setIsFading(true);
        }, 2600);
      }
    }

    return () => clearTimeout(timer);
  }, [charIndex, isFading, index, current.phrase]);

  const displayedPhrase = current.phrase.slice(0, charIndex);

  return (
    <div style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div 
        style={{ 
          opacity: isFading ? 0 : 1,
          filter: isFading ? 'blur(4px)' : 'blur(0px)',
          transform: isFading ? 'translateY(-5px)' : 'translateY(0)',
          transition: 'opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1), filter 0.65s ease, transform 0.65s ease'
        }}
      >
        {/* Language Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span 
            style={{ 
              fontSize: '0.72rem', 
              fontWeight: 800, 
              letterSpacing: '0.5px',
              background: 'var(--urp-green-light)', 
              color: 'var(--urp-green-primary)',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(15, 81, 66, 0.2)'
            }}
          >
            {current.code}
          </span>
          <span 
            className="badge-tag" 
            style={{ 
              background: 'rgba(2, 132, 199, 0.08)', 
              color: 'var(--accent-blue)', 
              border: '1px solid rgba(2, 132, 199, 0.2)' 
            }}
          >
            <Languages size={13} /> {current.lang}
          </span>
        </div>

        {/* Typewritten Title */}
        <h1 
          className="font-display" 
          style={{ 
            fontSize: 'clamp(3rem, 5.5vw, 4.8rem)', 
            fontWeight: 800, 
            lineHeight: 1.1,
            color: 'var(--urp-green-deep)',
            marginBottom: '12px',
            minHeight: '1.25em',
            textShadow: '0 2px 16px rgba(255, 255, 255, 0.95), 0 0 30px rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'flex-end',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ whiteSpace: 'pre-line' }}>{displayedPhrase}</span>
          <span 
            className="typewriter-cursor"
            style={{
              display: 'inline-block',
              width: '3.5px',
              height: '0.85em',
              marginLeft: '6px',
              backgroundColor: 'var(--urp-green-primary)',
              borderRadius: '2px',
              verticalAlign: 'baseline',
              opacity: isFading ? 0 : 1
            }}
          />
        </h1>

        {/* Subtitle */}
        <p 
          style={{ 
            color: 'var(--text-muted)', 
            fontSize: '1.15rem', 
            fontWeight: 600,
            textShadow: '0 1px 10px rgba(255, 255, 255, 0.9)',
            opacity: charIndex > 0 ? 1 : 0,
            transition: 'opacity 0.4s ease'
          }}
        >
          {current.sub}
        </p>
      </div>
    </div>
  );
};
