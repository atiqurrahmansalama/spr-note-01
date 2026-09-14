import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import UniversalPrintModal from '@/components/print/UniversalPrintModal';
import { TemplatePlaceholderKey } from '@/components/print/docxTemplateEngine';
import AdmitCardCanvas from './AdmitCardCanvas';
import { AdmitCardStudent, AdmitCardPrintLayout } from '../types';

export const ADMIT_CARD_PLACEHOLDER_KEYS: TemplatePlaceholderKey[] = [
  // Student Profile
  { key: 'student_name', label: 'Student Full Name', category: 'student', sampleValue: 'Rahim Ahmed', description: 'Full name of examinee' },
  { key: 'roll_number', label: 'Roll Number', category: 'student', sampleValue: '101', description: 'Candidate class roll' },
  { key: 'uniq_id', label: 'Student ID / Reg No', category: 'student', sampleValue: 'STD-2026-0042', description: 'Unique candidate identifier' },
  { key: 'class_name', label: 'Class / Grade', category: 'student', sampleValue: 'Class 10', description: 'Academic class' },
  { key: 'section_name', label: 'Section', category: 'student', sampleValue: 'Section A', description: 'Classroom section' },
  { key: 'group_name', label: 'Academic Group', category: 'student', sampleValue: 'Science', description: 'Academic group or stream' },
  { key: 'father_name', label: 'Father / Guardian Name', category: 'student', sampleValue: 'Mohammad Ali', description: 'Guardian or father' },
  { key: 'gender', label: 'Gender', category: 'student', sampleValue: 'Male', description: 'Student gender' },

  // Examination Details
  { key: 'exam_title', label: 'Examination Title', category: 'examination', sampleValue: 'Annual Examination 2026', description: 'Examination term title' },
  { key: 'room_number', label: 'Allocated Room / Hall', category: 'examination', sampleValue: 'Hall 204 (East Wing)', description: 'Exam hall room' },
  { key: 'session_year', label: 'Academic Session Year', category: 'examination', sampleValue: '2026', description: 'Session year' },

  // Institution
  { key: 'institution_name', label: 'Institution Name', category: 'institution', sampleValue: 'TaleemOS Academic Institution', description: 'Official institution name' },
  { key: 'institution_address', label: 'Institution Address', category: 'institution', sampleValue: 'Main Campus, Education Boulevard', description: 'Campus address' },

  // General Meta
  { key: 'print_date', label: 'Print Date', category: 'general', sampleValue: new Date().toLocaleDateString(), description: 'Print timestamp' },
  { key: 'issue_date', label: 'Issue Date', category: 'general', sampleValue: new Date().toLocaleDateString(), description: 'Admit card issue date' },
];

export interface AdmitCardPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: AdmitCardStudent[];
  institutionDetails: {
    name: string;
    address: string;
    logo?: string;
    sessionYear: string;
  };
}

/**
 * Admit Card Print Studio
 * 
 * Master Print & Export Studio for Student Admit Cards powered by UniversalPrintModal.
 * Supports multi-card density templates (1, 2, or 4 cards per A4 page),
 * full zoom/pan workbench, PDF/PNG/JPG/Word/Direct-Print export, and live in-place editing.
 */
export default function AdmitCardPrintModal({
  isOpen,
  onClose,
  cards,
  institutionDetails,
}: AdmitCardPrintModalProps) {
  const [layout, setLayout] = useState<AdmitCardPrintLayout>('2_PER_PAGE');
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);

  // Live in-place editable state
  const [liveCards, setLiveCards] = useState<AdmitCardStudent[]>(() => cards || []);
  const [liveInstitution, setLiveInstitution] = useState(() => institutionDetails || {
    name: 'TaleemOS Academic Institution',
    address: 'Main Campus, Education Boulevard',
    sessionYear: '2026',
  });

  const prevCardsSigRef = useRef('');
  useEffect(() => {
    const sig = Array.isArray(cards) ? cards.map(c => `${c.id}_${c.uniqId}_${c.name}`).join(',') : '';
    if (sig && sig !== prevCardsSigRef.current) {
      prevCardsSigRef.current = sig;
      setLiveCards(cards);
    }
  }, [cards]);

  const prevInstSigRef = useRef('');
  useEffect(() => {
    const sig = institutionDetails ? `${institutionDetails.name}_${institutionDetails.address}_${institutionDetails.sessionYear}` : '';
    if (sig && sig !== prevInstSigRef.current) {
      prevInstSigRef.current = sig;
      setLiveInstitution(institutionDetails);
    }
  }, [institutionDetails]);

  const handleCardChange = useCallback((updatedCard: AdmitCardStudent) => {
    setLiveCards((prev) =>
      prev.map((c) => (c.id === updatedCard.id || c.uniqId === updatedCard.uniqId ? updatedCard : c))
    );
  }, []);

  const handleInstitutionNameChange = useCallback((newName: string) => {
    setLiveInstitution((prev) => ({ ...prev, name: newName }));
  }, []);

  const handleInstitutionAddressChange = useCallback((newAddress: string) => {
    setLiveInstitution((prev) => ({ ...prev, address: newAddress }));
  }, []);

  const printTemplates = useMemo(() => [
    {
      id: '2_PER_PAGE',
      name: '2 Cards Per Sheet (Standard Double)',
      description: 'Standard double-card layout on portrait A4 sheet with cutting margin',
    },
    {
      id: '1_PER_PAGE',
      name: '1 Card Per Sheet (Full Page Detail)',
      description: 'Single large admit card per A4 page with complete timetable and instructions',
    },
    {
      id: '4_PER_PAGE',
      name: '4 Cards Per Sheet (Compact 2x2 Grid)',
      description: 'Four compact admit cards arranged on single page for fast distribution',
    },
  ], []);

  const cardsPerPage = useMemo(() => {
    switch (layout) {
      case '1_PER_PAGE':
        return 1;
      case '4_PER_PAGE':
        return 4;
      case '2_PER_PAGE':
      default:
        return 2;
    }
  }, [layout]);

  // Partition cards into printable pages
  const pages = useMemo(() => {
    const currentList = liveCards.length > 0 ? liveCards : cards;
    const list: AdmitCardStudent[][] = [];
    for (let i = 0; i < currentList.length; i += cardsPerPage) {
      list.push(currentList.slice(i, i + cardsPerPage));
    }
    return list;
  }, [liveCards, cards, cardsPerPage]);

  const defaultPrintOptions = useMemo(() => ({
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NARROW',
    colorMode: 'FULL_COLOR',
    density: 'NORMAL',
    fontSize: 100,
    enablePageBreak: true,
  }), []);

  const modalTitle = useMemo(() => {
    const currentList = liveCards.length > 0 ? liveCards : cards;
    if (currentList.length === 1) {
      return `Admit Card — ${currentList[0].name}`;
    }
    return `Student Admit Cards (${currentList.length} Examinees)`;
  }, [liveCards, cards]);

  const modalSubtitle = useMemo(() => {
    const currentList = liveCards.length > 0 ? liveCards : cards;
    const examName = currentList[0]?.examTitle || 'Examination';
    return `${examName} • ${liveInstitution.name} • ${liveInstitution.sessionYear || '2026'}`;
  }, [liveCards, cards, liveInstitution]);

  if (!isOpen) return null;

  return (
    <UniversalPrintModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      customSheets={true}
      data={liveCards.length > 0 ? liveCards : cards}
      placeholderKeys={ADMIT_CARD_PLACEHOLDER_KEYS}
      templates={printTemplates}
      activeTemplateId={layout}
      onTemplateChange={(tpl: any) => {
        if (tpl?.id) setLayout(tpl.id as AdmitCardPrintLayout);
      }}
      defaultOptions={defaultPrintOptions}
      urlSync={true}
      urlParam="print"
      urlParamValue="admit_cards"
    >
      <div className="flex flex-col items-center gap-8 print:gap-0 print:block">
        {pages.map((pageCards, pIdx) => (
          <div
            key={pIdx}
            className="relative paper-sheet-wrapper group"
          >
            <div
              className="paper-sheet rounded-xs print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:m-0 print:p-0 print:bg-white relative"
              data-size="A4"
              data-orientation="PORTRAIT"
              data-margin="NONE"
              data-density="NORMAL"
              data-color-mode="FULL_COLOR"
              data-page-break="true"
            >
              {layout === '2_PER_PAGE' ? (
                <div className="w-full h-full p-4 flex flex-col justify-between print:p-2.5">
                  {pageCards.map((card, cIdx) => (
                    <React.Fragment key={card.id || cIdx}>
                      {cIdx > 0 && (
                        <div className="flex items-center justify-center gap-2 py-1 my-0.5 text-slate-400 select-none print:py-0.5">
                          <span className="text-xs">✂</span>
                          <div className="flex-1 border-b border-dashed border-slate-400" />
                          <span className="text-[9px] uppercase tracking-wider font-semibold font-mono text-slate-400">
                            Cut Along Dotted Line
                          </span>
                          <div className="flex-1 border-b border-dashed border-slate-400" />
                          <span className="text-xs">✂</span>
                        </div>
                      )}
                      <div className="w-full print:break-inside-avoid">
                        <AdmitCardCanvas
                          card={card}
                          institutionName={liveInstitution.name}
                          institutionLogo={liveInstitution.logo}
                          institutionAddress={liveInstitution.address}
                          showSignature={showSignatures}
                          showQrCode={showQrCode}
                          layout={layout}
                          isEditable={true}
                          onCardChange={handleCardChange}
                          onInstitutionNameChange={handleInstitutionNameChange}
                          onInstitutionAddressChange={handleInstitutionAddressChange}
                          className="w-full shadow-xs print:shadow-none"
                        />
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              ) : layout === '4_PER_PAGE' ? (
                <div className="w-full h-full p-3 grid grid-cols-2 gap-2.5 print:p-2">
                  {pageCards.map((card, cIdx) => (
                    <div
                      key={card.id || cIdx}
                      className="w-full print:break-inside-avoid"
                    >
                      <AdmitCardCanvas
                        card={card}
                        institutionName={liveInstitution.name}
                        institutionLogo={liveInstitution.logo}
                        institutionAddress={liveInstitution.address}
                        showSignature={showSignatures}
                        showQrCode={showQrCode}
                        layout={layout}
                        isEditable={true}
                        onCardChange={handleCardChange}
                        onInstitutionNameChange={handleInstitutionNameChange}
                        onInstitutionAddressChange={handleInstitutionAddressChange}
                        className="w-full shadow-xs print:shadow-none"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full p-5 print:p-3">
                  {pageCards.map((card, cIdx) => (
                    <div
                      key={card.id || cIdx}
                      className="w-full h-full print:break-inside-avoid"
                    >
                      <AdmitCardCanvas
                        card={card}
                        institutionName={liveInstitution.name}
                        institutionLogo={liveInstitution.logo}
                        institutionAddress={liveInstitution.address}
                        showSignature={showSignatures}
                        showQrCode={showQrCode}
                        layout={layout}
                        isEditable={true}
                        onCardChange={handleCardChange}
                        onInstitutionNameChange={handleInstitutionNameChange}
                        onInstitutionAddressChange={handleInstitutionAddressChange}
                        className="w-full h-full shadow-xs print:shadow-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </UniversalPrintModal>
  );
}


