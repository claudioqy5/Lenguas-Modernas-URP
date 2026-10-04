import React, { useState, useEffect, useMemo } from 'react';
import { Search, UserPlus, Edit3, Trash2, FileSpreadsheet, Users } from 'lucide-react';
import { Student, LibraryPerson, PersonTypeValue, PERSON_TYPES, api, PostgraduateProgram } from '../../services/api';
import { exportCommunityMembersToExcel } from '../../utils/exportReports';

export interface UnifiedCommunityMember {
  id?: string;
  originalStudent?: Student;
  originalPerson?: LibraryPerson;
  personType: PersonTypeValue;
  code: string;
  documentNumber: string;
  fullName: string;
  faculty: string;
  career: string;
  program: string;
  email: string;
  phone: string;
  totalVisits: number;
  lastVisitAt?: string;
}

interface TabComunidadProps {
  students: Student[];
  persons: LibraryPerson[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterCareer: string;
  setFilterCareer: (val: string) => void;
  filterFaculty: string;
  setFilterFaculty: (val: string) => void;
  activePersonType: PersonTypeValue;
  setActivePersonType?: (val: PersonTypeValue) => void;
  onNewPerson: (type: PersonTypeValue) => void;
  onEditPerson: (person: LibraryPerson | Student) => void;
  onDeletePerson: (id?: string, type?: PersonTypeValue) => void;
  onNavigateToDifusion?: () => void;
}

const DEFAULT_MAESTRIAS = [
  "Maestría en Administración y Crecimiento Empresarial",
  "Arquitectura con Mención en Gestión Empresarial",
  "Arquitectura y Sostenibilidad",
  "Ciencia de Datos e Inteligencia Artificial",
  "Ciencia Política",
  "Comportamiento Organizacional y Recursos Humanos",
  "Docencia Superior e Innovación Educativa",
  "Ecología y Gestión Ambiental",
  "Ingeniería Informática con Mención en Ingeniería de Software",
  "Ingeniería Vial con Mención en Carreteras, Puentes y Túneles",
  "Museología y Gestión Cultural",
  "Psicología Clínica y de la Salud",
  "Salud Pública con Mención en Administración Hospitalaria y de Servicios de Salud",
  "Supply Chain Management"
];

const DEFAULT_DOCTORADOS = [
  "Administración de Negocios Globales",
  "Ciencia Política y Relaciones Internacionales"
];

export const TabComunidad: React.FC<TabComunidadProps> = ({
  students,
  persons,
  searchTerm,
  setSearchTerm,
  filterCareer,
  setFilterCareer,
  filterFaculty,
  setFilterFaculty,
  activePersonType,
  setActivePersonType,
  onNewPerson,
  onEditPerson,
  onDeletePerson
}) => {
  const [filterProgram, setFilterProgram] = useState('ALL');
  const [dbPrograms, setDbPrograms] = useState<PostgraduateProgram[]>([]);

  // Cargar programas oficiales de la BD para tener el catálogo completo en los filtros
  useEffect(() => {
    let isMounted = true;
    api.getPostgraduatePrograms().then(progs => {
      if (isMounted && progs && progs.length > 0) {
        setDbPrograms(progs);
      }
    }).catch(err => {
      console.warn('Could not load programs in TabComunidad:', err);
    });
    return () => { isMounted = false; };
  }, []);

  // 1. Unificar todos los usuarios (Students + LibraryPersons) con deduplicación inteligente
  const combinedMembers = useMemo<UnifiedCommunityMember[]>(() => {
    const list: UnifiedCommunityMember[] = [];
    const keyIndexMap = new Map<string, number>();

    // Paso A: Agregar LibraryPersons (Docentes, Visitantes, Maestrandos, Doctorandos, Alumnos)
    persons.forEach(p => {
      const member: UnifiedCommunityMember = {
        id: p.id,
        originalPerson: p,
        personType: p.personType || 'Visitante',
        code: (p.code || '').trim(),
        documentNumber: (p.documentNumber || '').trim(),
        fullName: p.fullName?.trim() || `${p.lastName || ''} ${p.firstName || ''}`.trim() || '—',
        faculty: (p.faculty || '').trim(),
        career: (p.career || '').trim(),
        program: (p.program || '').trim(),
        email: (p.email || '').trim(),
        phone: (p.phone || '').trim(),
        totalVisits: p.totalVisits || 0,
        lastVisitAt: p.lastVisitAt
      };

      const idx = list.length;
      list.push(member);

      if (member.code) keyIndexMap.set(`code:${member.code.toLowerCase()}`, idx);
      if (member.documentNumber) keyIndexMap.set(`doc:${member.documentNumber.toLowerCase()}`, idx);
      if (p.id) keyIndexMap.set(`id:${p.id}`, idx);
    });

    // Paso B: Agregar o fusionar Students
    students.forEach(s => {
      const codeKey = s.studentCode ? `code:${s.studentCode.trim().toLowerCase()}` : '';
      const docKey = s.documentNumber ? `doc:${s.documentNumber.trim().toLowerCase()}` : '';
      const idKey = s.id ? `id:${s.id}` : '';

      const existingIdx = 
        (codeKey && keyIndexMap.has(codeKey)) ? keyIndexMap.get(codeKey) :
        (docKey && keyIndexMap.has(docKey)) ? keyIndexMap.get(docKey) :
        (idKey && keyIndexMap.has(idKey)) ? keyIndexMap.get(idKey) :
        undefined;

      if (existingIdx !== undefined) {
        const existing = list[existingIdx];
        if (!existing.originalStudent) existing.originalStudent = s;
        if (!existing.faculty && s.faculty) existing.faculty = s.faculty.trim();
        if (!existing.career && s.career) existing.career = s.career.trim();
        if (!existing.code && s.studentCode) existing.code = s.studentCode.trim();
        if (!existing.documentNumber && s.documentNumber) existing.documentNumber = s.documentNumber.trim();
        if (!existing.email && s.email) existing.email = s.email.trim();
        if (!existing.phone && s.phone) existing.phone = s.phone.trim();
        if ((s.totalVisits || 0) > (existing.totalVisits || 0)) {
          existing.totalVisits = s.totalVisits;
        }
        if (!existing.lastVisitAt && s.lastVisitAt) {
          existing.lastVisitAt = s.lastVisitAt;
        }
      } else {
        const member: UnifiedCommunityMember = {
          id: s.id,
          originalStudent: s,
          personType: 'Alumno',
          code: (s.studentCode || '').trim(),
          documentNumber: (s.documentNumber || '').trim(),
          fullName: s.fullName?.trim() || `${s.lastName || ''} ${s.firstName || ''}`.trim() || '—',
          faculty: (s.faculty || '').trim(),
          career: (s.career || '').trim(),
          program: '',
          email: (s.email || '').trim(),
          phone: (s.phone || '').trim(),
          totalVisits: s.totalVisits || 0,
          lastVisitAt: s.lastVisitAt
        };

        const idx = list.length;
        list.push(member);

        if (member.code) keyIndexMap.set(`code:${member.code.toLowerCase()}`, idx);
        if (member.documentNumber) keyIndexMap.set(`doc:${member.documentNumber.toLowerCase()}`, idx);
        if (s.id) keyIndexMap.set(`id:${s.id}`, idx);
      }
    });

    return list;
  }, [students, persons]);

  // Catálogos dinámicos para los filtros específicos
  const maestriaProgramsList = useMemo(() => {
    const fromDb = dbPrograms.filter(p => p.degreeType === 'Maestría').map(p => p.name);
    const fromMembers = combinedMembers.filter(m => m.personType === 'Maestrando').map(m => m.program).filter(Boolean);
    const set = new Set([...fromDb, ...DEFAULT_MAESTRIAS, ...fromMembers]);
    return Array.from(set).sort();
  }, [dbPrograms, combinedMembers]);

  const doctoradoProgramsList = useMemo(() => {
    const fromDb = dbPrograms.filter(p => p.degreeType === 'Doctorado').map(p => p.name);
    const fromMembers = combinedMembers.filter(m => m.personType === 'Doctorando').map(m => m.program).filter(Boolean);
    const set = new Set([...fromDb, ...DEFAULT_DOCTORADOS, ...fromMembers]);
    return Array.from(set).sort();
  }, [dbPrograms, combinedMembers]);

  const faculties = useMemo(() => {
    const relevant = combinedMembers.filter(m => activePersonType === 'Todos' || m.personType === activePersonType);
    const list = relevant.map(m => m.faculty).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [combinedMembers, activePersonType]);

  const availableCareers = useMemo(() => {
    const relevant = combinedMembers.filter(m => activePersonType === 'Todos' || m.personType === activePersonType);
    if (filterFaculty === 'ALL') {
      return Array.from(new Set(relevant.map(m => m.career).filter(Boolean))).sort();
    }
    return Array.from(new Set(relevant.filter(m => m.faculty === filterFaculty).map(m => m.career).filter(Boolean))).sort();
  }, [combinedMembers, activePersonType, filterFaculty]);

  // 2. Filtrar miembros unificados
  const filteredMembers = useMemo(() => {
    return combinedMembers.filter(m => {
      // Filtro de Rol
      if (activePersonType !== 'Todos') {
        if (m.personType !== activePersonType) return false;
      }

      // Filtro de Facultad (solo si aplica)
      if (filterFaculty !== 'ALL' && m.faculty !== filterFaculty) {
        return false;
      }

      // Filtro de Carrera (solo si aplica)
      if (filterCareer !== 'ALL' && m.career !== filterCareer) {
        return false;
      }

      // Filtro de Programa (solo si aplica a Maestrandos o Doctorandos)
      if (filterProgram !== 'ALL' && m.program !== filterProgram) {
        return false;
      }

      // Búsqueda en todos los campos
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const match =
          m.fullName.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          m.documentNumber.toLowerCase().includes(q) ||
          m.faculty.toLowerCase().includes(q) ||
          m.career.toLowerCase().includes(q) ||
          m.program.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.phone.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [combinedMembers, activePersonType, filterFaculty, filterCareer, filterProgram, searchTerm]);

  const handleRoleChange = (type: PersonTypeValue) => {
    if (setActivePersonType) {
      setActivePersonType(type);
    }
    // Restablecer filtros secundarios al cambiar de rol
    setFilterFaculty('ALL');
    setFilterCareer('ALL');
    setFilterProgram('ALL');
  };

  const handleFacultyFilterChange = (newFac: string) => {
    setFilterFaculty(newFac);
    if (newFac !== 'ALL') {
      const allowed = combinedMembers.filter(m => m.faculty === newFac).map(m => m.career);
      if (filterCareer !== 'ALL' && !allowed.includes(filterCareer)) {
        setFilterCareer('ALL');
      }
    }
  };

  const getRoleSingular = (type: PersonTypeValue) => {
    switch (type) {
      case 'Todos': return 'Usuario';
      case 'Alumno': return 'Alumno';
      case 'Docente': return 'Docente';
      case 'Visitante': return 'Visitante';
      case 'Maestrando': return 'Maestrando';
      case 'Doctorando': return 'Doctorando';
      default: return type;
    }
  };

  const getRolePlural = (type: PersonTypeValue) => {
    switch (type) {
      case 'Todos': return 'usuarios';
      case 'Alumno': return 'alumnos';
      case 'Docente': return 'docentes';
      case 'Visitante': return 'visitantes';
      case 'Maestrando': return 'maestrandos';
      case 'Doctorando': return 'doctorandos';
      default: return 'registros';
    }
  };

  const getRoleCount = (type: PersonTypeValue) => {
    if (type === 'Todos') return combinedMembers.length;
    return combinedMembers.filter(m => m.personType === type).length;
  };

  const getRoleBadgeStyle = (type: PersonTypeValue) => {
    switch (type) {
      case 'Alumno':
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 'Docente':
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Visitante':
        return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
      case 'Maestrando':
        return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' };
      case 'Doctorando':
        return { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  const handleExportExcel = () => {
    exportCommunityMembersToExcel(filteredMembers, activePersonType);
  };

  const handleNewClick = () => {
    onNewPerson(activePersonType === 'Todos' ? 'Alumno' : activePersonType);
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Barra Única Consolidada: Buscador + Selector de Roles + Filtros Contextuales + Excel + Nuevo Usuario */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}>
        
        {/* Zona Izquierda: Buscador, Lista Desplegable de Roles y Filtros Contextuales */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', flex: 1, minWidth: '320px' }}>
          
          {/* 1. Buscador */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activePersonType === 'Todos'
                  ? 'Buscar por código, DNI, nombres, correo...'
                  : `Buscar ${getRoleSingular(activePersonType).toLowerCase()} por código, DNI o nombre...`
              }
              className="input-futuristic"
              style={{ paddingLeft: '40px', fontSize: '0.88rem', padding: '9px 14px 9px 40px', width: '100%' }}
            />
          </div>

          {/* 2. Lista Desplegable de Roles (Todos, Alumnos, Docentes, Visitantes, Maestrandos, Doctorandos) */}
          <select
            value={activePersonType}
            onChange={(e) => handleRoleChange(e.target.value as PersonTypeValue)}
            className="input-futuristic"
            style={{
              fontSize: '0.88rem',
              padding: '9px 14px',
              width: 'auto',
              fontWeight: 700,
              color: 'var(--urp-green-primary)',
              background: '#ffffff',
              border: '1px solid rgba(15, 81, 66, 0.3)'
            }}
          >
            <option value="Todos">Todos ({getRoleCount('Todos')})</option>
            <option value="Alumno">Alumnos ({getRoleCount('Alumno')})</option>
            <option value="Docente">Docentes ({getRoleCount('Docente')})</option>
            <option value="Visitante">Visitantes ({getRoleCount('Visitante')})</option>
            <option value="Maestrando">Maestrandos ({getRoleCount('Maestrando')})</option>
            <option value="Doctorando">Doctorandos ({getRoleCount('Doctorando')})</option>
          </select>

          {/* 3. Filtros Contextuales que aparecen al costado según el rol seleccionado */}
          {/* CASO A: ALUMNOS (Facultad y Carrera) */}
          {activePersonType === 'Alumno' && faculties.length > 0 && (
            <>
              <select
                value={filterFaculty}
                onChange={(e) => handleFacultyFilterChange(e.target.value)}
                className="input-futuristic"
                style={{ fontSize: '0.88rem', padding: '9px 14px', width: 'auto' }}
              >
                <option value="ALL">Todas las Facultades</option>
                {faculties.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select
                value={filterCareer}
                onChange={(e) => setFilterCareer(e.target.value)}
                className="input-futuristic"
                style={{ fontSize: '0.88rem', padding: '9px 14px', width: 'auto' }}
              >
                <option value="ALL">{filterFaculty === 'ALL' ? 'Todas las Carreras' : `Carreras de ${filterFaculty}`}</option>
                {availableCareers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}

          {/* CASO B: MAESTRANDOS (Programa de Maestría) */}
          {activePersonType === 'Maestrando' && (
            <select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="input-futuristic"
              style={{ fontSize: '0.88rem', padding: '9px 14px', width: 'auto', maxWidth: '340px' }}
            >
              <option value="ALL">Todos los Programas de Maestría</option>
              {maestriaProgramsList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          {/* CASO C: DOCTORANDOS (Programa de Doctorado) */}
          {activePersonType === 'Doctorando' && (
            <select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="input-futuristic"
              style={{ fontSize: '0.88rem', padding: '9px 14px', width: 'auto', maxWidth: '340px' }}
            >
              <option value="ALL">Todos los Programas de Doctorado</option>
              {doctoradoProgramsList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          {/* CASO D: DOCENTES (Facultad) */}
          {activePersonType === 'Docente' && faculties.length > 0 && (
            <select
              value={filterFaculty}
              onChange={(e) => handleFacultyFilterChange(e.target.value)}
              className="input-futuristic"
              style={{ fontSize: '0.88rem', padding: '9px 14px', width: 'auto' }}
            >
              <option value="ALL">Todas las Facultades</option>
              {faculties.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          )}
        </div>

        {/* Zona Derecha: Contador de Resultados + Botón Excel + Botón Nuevo Usuario */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 600, padding: '0 4px', whiteSpace: 'nowrap' }}>
            Total: <span style={{ color: 'var(--urp-green-primary)', fontWeight: 700 }}>{filteredMembers.length}</span> {getRolePlural(activePersonType)}
          </div>

          <button
            onClick={handleExportExcel}
            title={`Exportar directorio de ${getRolePlural(activePersonType)} a Excel (.xlsx)`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #16a34a',
              background: '#f0fdf4',
              color: '#15803d',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#15803d';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f0fdf4';
              e.currentTarget.style.color = '#15803d';
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Excel</span>
          </button>

          <button
            onClick={handleNewClick}
            title={activePersonType === 'Todos' ? 'Registrar nuevo usuario' : `Registrar nuevo ${getRoleSingular(activePersonType).toLowerCase()}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #0f5142',
              background: 'var(--urp-green-primary)',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(15, 81, 66, 0.2)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0b3d32';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--urp-green-primary)';
            }}
          >
            <UserPlus size={15} />
            <span>{activePersonType === 'Todos' ? 'Nuevo Usuario' : `Nuevo ${getRoleSingular(activePersonType)}`}</span>
          </button>
        </div>
      </div>

      {/* Tabla Unificada de la Comunidad: Alumnos, Docentes, Visitantes, Maestrandos y Doctorandos */}
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', background: '#f8fafc', fontSize: '0.80rem', fontWeight: 700, letterSpacing: '0.03em' }}>
              <th style={{ padding: '12px 14px', width: '45px' }}>#</th>
              <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>CODIGO</th>
              <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>DNI</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '220px' }}>NOMBRES COMPLETOS</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '170px' }}>FACULTAD</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '170px' }}>CARRERA PROFESIONAL</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '180px' }}>PROGRAMA</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '170px' }}>CORREO</th>
              <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>CELULAR</th>
              <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>TOTAL VISITAS</th>
              <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>ULTIMA VISITA</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', width: '90px' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Users size={38} style={{ margin: '0 auto 12px', opacity: 0.35, color: '#0f5142' }} />
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                    No se encontraron {getRolePlural(activePersonType)} registrados.
                  </p>
                  <p style={{ fontSize: '0.82rem' }}>
                    Haz clic en "{activePersonType === 'Todos' ? '+ Nuevo Usuario' : `+ Nuevo ${getRoleSingular(activePersonType)}`}" para agregar un nuevo registro a la comunidad.
                  </p>
                </td>
              </tr>
            ) : (
              filteredMembers.map((member, idx) => (
                <tr
                  key={member.id || `${member.personType}-${member.code}-${member.documentNumber}-${idx}`}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                  className="table-row-hover"
                >
                  {/* # */}
                  <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '0.8rem' }}>{idx + 1}</td>

                  {/* CODIGO */}
                  <td style={{ padding: '12px 14px' }}>
                    {member.code ? (
                      <span style={{ fontWeight: 700, color: 'var(--urp-green-primary)', fontFamily: 'monospace, sans-serif' }}>
                        {member.code}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  {/* DNI */}
                  <td style={{ padding: '12px 14px' }}>
                    {member.documentNumber ? (
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {member.documentNumber}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  {/* NOMBRES COMPLETOS */}
                  <td style={{ padding: '12px 14px', textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                      {member.fullName}
                    </div>
                    {activePersonType === 'Todos' && member.personType && (
                      <div style={{ marginTop: '2px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '1px 8px',
                          borderRadius: '12px',
                          fontSize: '0.70rem',
                          fontWeight: 600,
                          background: getRoleBadgeStyle(member.personType).bg,
                          color: getRoleBadgeStyle(member.personType).color,
                          border: `1px solid ${getRoleBadgeStyle(member.personType).border}`
                        }}>
                          {member.personType}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* FACULTAD */}
                  <td style={{ padding: '12px 14px', textAlign: 'left', color: '#475569', fontSize: '0.84rem' }}>
                    {member.faculty || '—'}
                  </td>

                  {/* CARRERA PROFESIONAL */}
                  <td style={{ padding: '12px 14px', textAlign: 'left', color: '#475569', fontSize: '0.84rem' }}>
                    {member.career || '—'}
                  </td>

                  {/* PROGRAMA */}
                  <td style={{ padding: '12px 14px', textAlign: 'left', color: member.program ? '#0f5142' : '#94a3b8', fontWeight: member.program ? 600 : 400, fontSize: '0.84rem' }}>
                    {member.program || '—'}
                  </td>

                  {/* CORREO */}
                  <td style={{ padding: '12px 14px', textAlign: 'left', color: member.email ? '#64748b' : '#94a3b8', fontSize: '0.83rem' }}>
                    {member.email || '—'}
                  </td>

                  {/* CELULAR */}
                  <td style={{ padding: '12px 14px', color: member.phone ? '#64748b' : '#94a3b8', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                    {member.phone || '—'}
                  </td>

                  {/* TOTAL VISITAS */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: 'rgba(15, 81, 66, 0.08)',
                      color: 'var(--urp-green-primary)',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}>
                      {member.totalVisits || 0}
                    </span>
                  </td>

                  {/* ULTIMA VISITA */}
                  <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {member.lastVisitAt ? new Date(member.lastVisitAt).toLocaleDateString('es-PE') : 'Sin visitas'}
                  </td>

                  {/* ACCIONES */}
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => {
                          if (member.originalPerson) {
                            onEditPerson(member.originalPerson);
                          } else if (member.originalStudent) {
                            onEditPerson(member.originalStudent);
                          } else {
                            onEditPerson({
                              id: member.id,
                              personType: member.personType,
                              code: member.code,
                              documentNumber: member.documentNumber,
                              firstName: '',
                              lastName: '',
                              fullName: member.fullName,
                              faculty: member.faculty,
                              career: member.career,
                              program: member.program,
                              email: member.email,
                              phone: member.phone,
                              totalVisits: member.totalVisits,
                              lastVisitAt: member.lastVisitAt
                            });
                          }
                        }}
                        title={`Editar datos de ${member.fullName}`}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#0284c7',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#0284c7';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.color = '#0284c7';
                        }}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => onDeletePerson(member.id, member.personType)}
                        title={`Eliminar ${getRoleSingular(member.personType).toLowerCase()} ${member.fullName}`}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid #fee2e2',
                          background: '#fef2f2',
                          color: '#ef4444',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#ef4444';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#fef2f2';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
