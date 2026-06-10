import React from 'react';
import MarkdownBlock from '../../../common/MarkdownBlock';
import { NMAP_DOC } from '../constants';

interface InformationTabProps {
  accentColor: string;
}

const NmapInformationTab: React.FC<InformationTabProps> = ({ accentColor }) => {
  return <MarkdownBlock content={NMAP_DOC} accentColor={accentColor} />;
};

export default NmapInformationTab;