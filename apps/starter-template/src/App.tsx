import React, { useState } from 'react';
import {
  CustomButton,
  CustomInput,
  CustomSelect,
  SegmentedSwitch,
  StatusBadge,
} from '@repo/ui';
import {
  isUserSuperAdmin,
  extractRoleName,
  interpolateTemplate,
  formatTime12H,
} from '@repo/core-modules';
import { validateEmail } from '@repo/utils';

export default function App() {
  const [selectedView, setSelectedView] = useState<'overview' | 'iam' | 'notifications'>('overview');
  const [emailInput, setEmailInput] = useState('developer@sprnote.org');
  const [mockRole, setMockRole] = useState('ADMIN');

  // Core IAM demonstration
  const dummyUser = {
    id: 101,
    role_code: mockRole,
    role_name: mockRole === 'ADMIN' ? 'Institutional Administrator' : 'Platform Super User',
    is_superuser: mockRole === 'SUPER_ADMIN',
  };
  const isSuper = isUserSuperAdmin(dummyUser);
  const displayRoleName = extractRoleName(dummyUser);
  const isEmailValid = validateEmail(emailInput);

  // Notifications demonstration
  const parsedMemo = interpolateTemplate(
    'Assalamu Alaikum {{name}}, your shift begins at {{time}}.',
    { name: 'Ustadh Ahmad', time: formatTime12H('08:30') }
  );

  return (
    <div className="min-h-screen p-6 sm:p-10 max-w-5xl mx-auto space-y-8 theme-bg-app theme-text-primary">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold theme-bg-elevated theme-text-secondary">
            <StatusBadge status="ACTIVE" className="w-3.5 h-3.5" />
            <span>Monorepo Satellite Project</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
            Starter Template Blueprint
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Zero-duplication enterprise workspace consuming @repo/ui, @repo/theme, @repo/utils, and @repo/core-modules.
          </p>
        </div>

        <SegmentedSwitch
          options={[
            { id: 'overview', label: 'Overview' },
            { id: 'iam', label: 'IAM Engine' },
            { id: 'notifications', label: 'Notifications' },
          ]}
          value={selectedView}
          onChange={(val) => setSelectedView(val as 'overview' | 'iam' | 'notifications')}
        />
      </header>

      {/* Main Content Areas */}
      <main className="space-y-6">
        {selectedView === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="theme-bg-surface rounded-3xl p-6 shadow-xs border-0 space-y-4">
              <div>
                <h2 className="text-lg font-bold">Shared UI Components</h2>
                <p className="text-xs text-gray-500">Directly rendered from @repo/ui</p>
              </div>

              <div className="space-y-4 pt-2">
                <CustomInput
                  label="Email Verification"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter email address"
                  helperText={isEmailValid ? 'Valid email format' : 'Invalid email format'}
                  hasError={!isEmailValid}
                />

                <div className="flex flex-wrap gap-2 pt-2">
                  <CustomButton variant="primary" size="md">
                    Primary Action
                  </CustomButton>
                  <CustomButton variant="secondary" size="md">
                    Secondary
                  </CustomButton>
                  <CustomButton variant="outline" size="md">
                    Outline
                  </CustomButton>
                </div>
              </div>
            </div>

            <div className="theme-bg-surface rounded-3xl p-6 shadow-xs border-0 space-y-4">
              <div>
                <h2 className="text-lg font-bold">Ecosystem Metrics</h2>
                <p className="text-xs text-gray-500">Real-time workspace link state</p>
              </div>

              <div className="space-y-3 pt-2 text-sm">
                <div className="flex items-center justify-between p-3 rounded-2xl theme-bg-app border-0">
                  <span className="font-medium">Turborepo Orchestration</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl theme-bg-app border-0">
                  <span className="font-medium">pnpm Workspaces Symlink</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Linked
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl theme-bg-app border-0">
                  <span className="font-medium">TypeScript Strict Types</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    100% Shared
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'iam' && (
          <div className="theme-bg-surface rounded-3xl p-6 shadow-xs border-0 space-y-4">
            <div>
              <h2 className="text-lg font-bold">Domain Engine: IAM</h2>
              <p className="text-xs text-gray-500">Tested via @repo/core-modules/iam</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="max-w-xs">
                <CustomSelect
                  label="Simulate User Role"
                  value={mockRole}
                  onChange={(val) => setMockRole(String(val))}
                  options={[
                    { value: 'ADMIN', label: 'Institutional Administrator' },
                    { value: 'SUPER_ADMIN', label: 'Platform Super Admin' },
                    { value: 'TEACHER', label: 'Faculty Instructor' },
                    { value: 'STUDENT', label: 'Enrolled Student' },
                  ]}
                />
              </div>

              <div className="p-4 rounded-2xl theme-bg-app space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Resolved Role Name:</span>
                  <span className="font-semibold">{displayRoleName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Is Super Admin:</span>
                  <span className="font-semibold">{isSuper ? 'Yes (Platform Authority)' : 'No (Scoped Authority)'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'notifications' && (
          <div className="theme-bg-surface rounded-3xl p-6 shadow-xs border-0 space-y-4">
            <div>
              <h2 className="text-lg font-bold">Domain Engine: Notifications</h2>
              <p className="text-xs text-gray-500">Tested via @repo/core-modules/notifications</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl theme-bg-app space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Interpolated Template Output
                </span>
                <p className="text-sm font-medium theme-text-primary whitespace-pre-line">
                  {parsedMemo}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
