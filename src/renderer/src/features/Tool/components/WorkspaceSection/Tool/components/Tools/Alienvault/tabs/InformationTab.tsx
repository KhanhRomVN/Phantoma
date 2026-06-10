import React from 'react';
import MarkdownBlock from '../../../common/MarkdownBlock';
import { ALIENVAULT_DOC } from '../constants';

interface InformationTabProps {
  accentColor: string;
}

const AlienvaultInformationTab: React.FC<InformationTabProps> = ({ accentColor }) => {
  return <MarkdownBlock content={ALIENVAULT_DOC} accentColor={accentColor} />;
};

export default AlienvaultInformationTab;