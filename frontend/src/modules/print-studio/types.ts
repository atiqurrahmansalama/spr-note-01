export type PrintStudioTab = 'canvas' | 'templates' | 'history' | 'settings';

export interface PrintStudioState {
  activeTab: PrintStudioTab;
  zoomLevel: number;
  selectedTemplateId: string | null;
  isLoading: boolean;
}

export interface PrintStudioProps {
  initialTab?: PrintStudioTab;
  className?: string;
}
