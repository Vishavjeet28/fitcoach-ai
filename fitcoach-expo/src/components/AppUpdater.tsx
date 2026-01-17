import React from 'react';
import { useAppUpdates } from '../hooks/useAppUpdates';

export const AppUpdater: React.FC = () => {
    useAppUpdates();
    return null;
};
