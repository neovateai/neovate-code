import open from 'open';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import pc from 'picocolors';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UI_COLORS } from '../../ui/constants';
import TextInput from '../../ui/TextInput/index.js';
import { useTerminalSize } from '../../ui/useTerminalSize';
import { useAppStore } from '../../ui/store';
import type { UIBridge } from '../../uiBridge';
import type { LocalJSXCommand } from '../types';

const TABS = ['Discover', 'Installed', 'Marketplaces'] as const;
type Tab = (typeof TABS)[number];

interface DiscoverPlugin {
  name: string;
  description?: string;
  marketplace: string;
  category?: string;
  tags?: string[];
  homepage?: string;
  installed: boolean;
  enabled?: boolean;
}

interface InstalledPlugin {
  name: string;
  version?: string;
  scope: 'global' | 'project' | 'local';
  enabled: boolean;
  installedAt: string;
  marketplace?: string;
  pendingUpdate?: boolean;
}

interface MarketplaceInfo {
  name: string;
  source: any;
  installLocation: string;
  lastUpdated: string;
  pluginCount: number;
  description?: string;
  owner?: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

const Divider: React.FC = () => {
  const { columns } = useTerminalSize();
  return (
    <Box>
      <Text color={UI_COLORS.ASK_PRIMARY} bold>
        {'─'.repeat(Math.max(0, columns))}
      </Text>
    </Box>
  );
};

const TabBar: React.FC<{ activeTab: Tab }> = ({ activeTab }) => (
  <Box flexDirection="column">
    <Divider />
    <Box>
      <Text bold color={UI_COLORS.ASK_PRIMARY}>
        Plugins
      </Text>
      <Text> </Text>
      {TABS.map((tab, i) => (
        <Box key={tab}>
          {i > 0 && <Text> </Text>}
          {activeTab === tab ? (
            <Text bold backgroundColor={UI_COLORS.ASK_PRIMARY} color="black">
              {` ${tab} `}
            </Text>
          ) : (
            <Text dimColor>{tab}</Text>
          )}
        </Box>
      ))}
      <Text dimColor> (←/→ or tab to cycle)</Text>
    </Box>
  </Box>
);

const DETAIL_MENU_ITEMS_BASE = [
  { key: 'user', label: 'Install for you (user scope)' },
  {
    key: 'project',
    label: 'Install for all collaborators on this repository (project scope)',
  },
  { key: 'local', label: 'Install for you, in this repo only (local scope)' },
] as const;

const PluginDetailView: React.FC<{
  plugin: DiscoverPlugin;
  onBack: () => void;
  onInstall: (scope: 'user' | 'project' | 'local') => void;
}> = ({ plugin, onBack, onInstall }) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { productName } = useAppStore();

  const menuItems = useMemo(
    () => [
      ...DETAIL_MENU_ITEMS_BASE,
      ...(plugin.homepage
        ? [{ key: 'homepage' as const, label: 'Open homepage' }]
        : []),
      { key: 'back' as const, label: 'Back to plugin list' },
    ],
    [plugin.homepage],
  );

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
    if (key.downArrow && selectedIndex < menuItems.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
    if (key.return && selectedIndex >= 0) {
      const item = menuItems[selectedIndex];
      if (item.key === 'back') {
        onBack();
      } else if (item.key === 'homepage' && plugin.homepage) {
        open(plugin.homepage);
      } else if (
        item.key === 'user' ||
        item.key === 'project' ||
        item.key === 'local'
      ) {
        onInstall(item.key);
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Plugin details</Text>
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>{plugin.name}</Text>
        <Text dimColor>from {plugin.marketplace}</Text>
      </Box>
      {plugin.description && (
        <Box marginBottom={1}>
          <Text>{plugin.description}</Text>
        </Box>
      )}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow">
          {'\u26A0'}Make sure you trust a plugin before installing, updating, or
          using it. {productName.toLowerCase()} does not control what MCP
          servers, files, or other software are included in plugins and cannot
          verify that they will work as intended or that they won't change. See
          each plugin's homepage for more information.
        </Text>
      </Box>
      <Box flexDirection="column">
        {menuItems.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Box key={item.key}>
              <Text color={isSelected ? UI_COLORS.ASK_PRIMARY : 'white'}>
                {isSelected ? '> ' : '  '}
                {item.label}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Select: Enter · Back: Esc</Text>
      </Box>
    </Box>
  );
};

const DiscoverView: React.FC<{
  onExit: (msg: string) => void;
  onSubViewChange?: (active: boolean) => void;
  refreshTrigger?: number;
  onPluginChange?: () => void;
}> = ({ onExit, onSubViewChange, refreshTrigger, onPluginChange }) => {
  const { bridge, cwd, productName } = useAppStore();
  const [plugins, setPlugins] = useState<DiscoverPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);
  const [detailPlugin, setDetailPlugin] = useState<DiscoverPlugin | null>(null);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());

  const pluginKey = (p: DiscoverPlugin) => `${p.name}@${p.marketplace}`;

  const toggleSelect = (p: DiscoverPlugin) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      const key = pluginKey(p);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const installSelected = async () => {
    const toInstall = filtered.filter(
      (p) => selectedSet.has(pluginKey(p)) && !p.installed,
    );
    if (toInstall.length === 0) return;
    const installed: string[] = [];
    for (const p of toInstall) {
      setInstalling(pluginKey(p));
      try {
        await bridge.request('plugin.install', {
          cwd,
          pluginName: p.name,
          marketplaceName: p.marketplace,
          scope: 'user',
        });
        installed.push(p.name);
      } catch {
        // ignore
      }
    }
    setInstalling(null);
    setSelectedSet(new Set());
    if (installed.length > 0) {
      onExit(
        `Installed ${installed.join(', ')}. Restart ${productName} to load new plugins.`,
      );
      return;
    }
    loadPlugins();
    onPluginChange?.();
  };

  const openDetail = (plugin: DiscoverPlugin) => {
    setDetailPlugin(plugin);
    onSubViewChange?.(true);
  };

  const closeDetail = () => {
    setDetailPlugin(null);
    onSubViewChange?.(false);
  };

  const loadPlugins = useCallback(async () => {
    try {
      const result = await bridge.request('plugin.discover', { cwd });
      if (result.success) {
        setPlugins(
          result.data.plugins.filter((p: DiscoverPlugin) => !p.installed),
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [bridge, cwd]);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins, refreshTrigger]);

  const PAGE_SIZE = 5;

  const filtered = plugins.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  });

  const scrollOffset = Math.max(
    0,
    Math.min(selectedIndex - PAGE_SIZE + 1, filtered.length - PAGE_SIZE),
  );
  const visiblePlugins = filtered.slice(scrollOffset, scrollOffset + PAGE_SIZE);

  useInput(
    (input, key) => {
      if (key.upArrow && selectedIndex > -1) {
        setSelectedIndex(selectedIndex - 1);
      }
      if (key.downArrow && selectedIndex < filtered.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
      if (key.backspace || key.delete) {
        if (selectedIndex === -1) {
          setSearchQuery(searchQuery.slice(0, -1));
        } else {
          setSelectedIndex(-1);
        }
      }
      if (input === ' ' && selectedIndex >= 0 && filtered.length > 0) {
        toggleSelect(filtered[selectedIndex]);
        return;
      }
      if (input === 'i' && selectedSet.size > 0) {
        installSelected();
        return;
      }
      if (key.return && filtered.length > 0) {
        if (selectedIndex === -1) {
          // focus search input
        } else {
          openDetail(filtered[selectedIndex]);
        }
      }
      if (
        !key.ctrl &&
        !key.meta &&
        input &&
        input.length === 1 &&
        input !== ' ' &&
        input !== 'i' &&
        input.charCodeAt(0) >= 32 &&
        input.charCodeAt(0) <= 126
      ) {
        if (selectedIndex === -1) {
          setSearchQuery(searchQuery + input);
        } else {
          setSearchQuery(searchQuery + input);
          setSelectedIndex(-1);
        }
      }
    },
    { isActive: !detailPlugin },
  );

  if (loading) {
    return (
      <Box>
        <Spinner type="dots" />
        <Text> Loading plugins...</Text>
      </Box>
    );
  }

  if (detailPlugin) {
    return (
      <PluginDetailView
        plugin={detailPlugin}
        onBack={() => closeDetail()}
        onInstall={(scope) => {
          if (detailPlugin.installed) return;
          setInstalling(`${detailPlugin.name}@${detailPlugin.marketplace}`);
          closeDetail();
          bridge
            .request('plugin.install', {
              cwd,
              pluginName: detailPlugin.name,
              marketplaceName: detailPlugin.marketplace,
              scope,
            })
            .then((result) => {
              if (result.success) {
                onExit(
                  `Installed ${detailPlugin.name}. Restart ${productName} to load new plugins.`,
                );
              } else {
                onExit(
                  result.error || `Failed to install ${detailPlugin.name}.`,
                );
              }
            })
            .catch((err: Error) => {
              setInstalling(null);
              onExit(err?.message || `Failed to install ${detailPlugin.name}.`);
            });
        }}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>Discover plugins </Text>
        <Text dimColor>
          ({Math.max(0, selectedIndex) + 1}/{filtered.length})
        </Text>
      </Box>
      <Box
        borderStyle="round"
        borderColor={selectedIndex === -1 ? UI_COLORS.ASK_PRIMARY : 'gray'}
        paddingLeft={1}
        paddingRight={1}
      >
        <Text color={selectedIndex === -1 ? UI_COLORS.ASK_PRIMARY : 'gray'}>
          {selectedIndex === -1 ? '\u276F ' : '\u2315 '}
        </Text>
        <Text color={selectedIndex === -1 ? 'white' : 'gray'}>
          {searchQuery}
          {selectedIndex === -1 && searchQuery && (
            <Text backgroundColor="white" color="black">
              {' '}
            </Text>
          )}
          {selectedIndex === -1 && !searchQuery ? (
            <Text>
              <Text backgroundColor="white" color="black">
                S
              </Text>
              <Text color="gray">{'earch\u2026'}</Text>
            </Text>
          ) : null}
          {!searchQuery && selectedIndex !== -1 && 'Search\u2026'}
        </Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {scrollOffset > 0 && <Text dimColor> {'\u2191'} more above</Text>}
        {visiblePlugins.map((p, i) => {
          const actualIndex = scrollOffset + i;
          const isSelected = actualIndex === selectedIndex;
          const indicator =
            installing === pluginKey(p)
              ? pc.yellow('\u25D0')
              : p.installed
                ? pc.white('\u25CF')
                : selectedSet.has(pluginKey(p))
                  ? pc.magenta('\u25C9')
                  : '\u25CB';
          return (
            <Box
              key={`${p.name}-${p.marketplace}`}
              flexDirection="column"
              marginTop={i > 0 ? 1 : 0}
            >
              <Box>
                <Text color={isSelected ? UI_COLORS.ASK_PRIMARY : 'white'}>
                  {isSelected ? '\u276F ' : '  '}
                </Text>
                <Text>{indicator} </Text>
                <Text bold color={isSelected ? UI_COLORS.ASK_PRIMARY : 'white'}>
                  {p.name}
                </Text>
                <Text dimColor> · {p.marketplace}</Text>
              </Box>
              {p.description && (
                <Box marginLeft={6}>
                  <Text dimColor>
                    {p.description.length > 70
                      ? `${p.description.slice(0, 67)}...`
                      : p.description}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
        {scrollOffset + PAGE_SIZE < filtered.length && (
          <Text dimColor> {'\u2193'} more below</Text>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          {selectedSet.size > 0 && (
            <Text color={UI_COLORS.ASK_PRIMARY} italic>
              Press i to install
            </Text>
          )}
          {selectedSet.size > 0 && ' · '}
          Type to search · Space: (de)select · Enter: details · Esc: back
        </Text>
      </Box>
    </Box>
  );
};

interface PluginDetail {
  name: string;
  version?: string;
  scope: 'global' | 'project' | 'local';
  enabled: boolean;
  marketplace?: string;
  description?: string;
  author?: string;
  installedAt: string;
  pendingUpdate?: boolean;
  components: {
    commands: string[];
    agents: string[];
    skills: string[];
    mcpServers: string[];
  };
}

const InstalledPluginDetailView: React.FC<{
  plugin: InstalledPlugin;
  onBack: () => void;
  onExit: (msg: string) => void;
  onPluginChange?: () => void;
}> = ({ plugin, onBack, onExit, onPluginChange }) => {
  const { bridge, cwd, productName } = useAppStore();
  const [detail, setDetail] = useState<PluginDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);

  const menuItems = [
    {
      key: 'toggle',
      label: detail?.enabled ? 'Disable plugin' : 'Enable plugin',
    },
    {
      key: 'mark-update',
      label: detail?.pendingUpdate ? 'Unmark for update' : 'Mark for update',
    },
    { key: 'update', label: 'Update now', color: 'yellow' },
    { key: 'uninstall', label: 'Uninstall', color: 'red' },
    { key: 'back', label: 'Back to plugin list' },
  ];

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    bridge
      .request('plugin.detail', {
        cwd,
        pluginName: plugin.name,
        marketplace: plugin.marketplace,
      })
      .then((result) => {
        if (result.success && result.data) {
          setDetail(result.data);
        }
      })
      .finally(() => setLoading(false));
  }, [bridge, cwd, plugin.name, plugin.marketplace]);

  useInput((_input, key) => {
    if (operating) return;
    if (key.escape) {
      onBack();
      return;
    }
    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
    if (key.downArrow && selectedIndex < menuItems.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
    if (key.return) {
      const item = menuItems[selectedIndex];
      if (item.key === 'back') {
        onBack();
      } else if (item.key === 'toggle') {
        const method = detail?.enabled ? 'plugin.disable' : 'plugin.enable';
        const verb = detail?.enabled ? 'Disabled' : 'Enabled';
        setOperating(true);
        bridge
          .request(method, {
            cwd,
            pluginName: plugin.name,
            marketplace: plugin.marketplace,
          })
          .then(() => {
            onExit(
              `${verb} ${plugin.name}. Restart ${productName} to apply changes.`,
            );
          })
          .catch((err: Error) => {
            setOperating(false);
            onExit(err?.message || `Failed to update ${plugin.name}.`);
          });
      } else if (item.key === 'mark-update') {
        const newPending = !detail?.pendingUpdate;
        setOperating(true);
        bridge
          .request('plugin.markForUpdate', {
            cwd,
            pluginName: plugin.name,
            marketplace: plugin.marketplace,
            pending: newPending,
          })
          .then(() => {
            const verb = newPending
              ? 'Marked for update'
              : 'Unmarked for update';
            onExit(
              `${verb} ${plugin.name}. Restart ${productName} to apply changes.`,
            );
          })
          .catch(() => {
            setOperating(false);
          });
      } else if (item.key === 'uninstall') {
        setOperating(true);
        bridge
          .request('plugin.uninstall', {
            cwd,
            pluginName: plugin.name,
            marketplace: plugin.marketplace,
          })
          .then(() => {
            onExit(
              `Uninstalled ${plugin.name}. Restart ${productName} to apply changes.`,
            );
          })
          .catch(() => {
            setOperating(false);
          });
      } else if (item.key === 'update') {
        setOperating(true);
        bridge
          .request('plugin.uninstall', {
            cwd,
            pluginName: plugin.name,
            marketplace: plugin.marketplace,
          })
          .then(() =>
            bridge.request('plugin.install', {
              cwd,
              pluginName: plugin.name,
              marketplaceName: plugin.marketplace || '',
              scope:
                plugin.scope === 'global'
                  ? 'user'
                  : plugin.scope === 'project'
                    ? 'project'
                    : 'local',
            }),
          )
          .then((result) => {
            if (result.success) {
              onExit(
                `Updated ${plugin.name}. Restart ${productName} to apply changes.`,
              );
            } else {
              onExit(result.error || `Failed to update ${plugin.name}.`);
            }
          })
          .catch(() => {
            setOperating(false);
          });
      }
    }
  });

  const scopeLabel: Record<string, string> = {
    global: 'user',
    project: 'project',
    local: 'local',
  };

  if (loading) {
    return (
      <Box>
        <Spinner type="dots" />
        <Text> Loading plugin details...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>
          {plugin.name}
          {plugin.marketplace ? ` @ ${plugin.marketplace}` : ''}
        </Text>
        <Text dimColor>Scope: {scopeLabel[plugin.scope] || plugin.scope}</Text>
        {detail?.description && <Text>{detail.description}</Text>}
      </Box>
      {detail && (
        <Box flexDirection="column" marginBottom={1}>
          {detail.author && (
            <Text>
              <Text dimColor>Author: </Text>
              {detail.author}
            </Text>
          )}
          <Text>
            <Text dimColor>Status: </Text>
            {detail.enabled ? (
              <Text color="green">Enabled</Text>
            ) : (
              <Text color="red">Disabled</Text>
            )}
          </Text>
          {detail.pendingUpdate && (
            <Text color="yellow">
              {'\u2191'} Update pending (will update on next restart)
            </Text>
          )}
        </Box>
      )}
      {detail &&
        (detail.components.commands.length > 0 ||
          detail.components.agents.length > 0 ||
          detail.components.skills.length > 0 ||
          detail.components.mcpServers.length > 0) && (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>Installed components:</Text>
            {detail.components.commands.length > 0 && (
              <Text dimColor>
                {' '}
                {'\u2022'} Commands: {detail.components.commands.join(', ')}
              </Text>
            )}
            {detail.components.agents.length > 0 && (
              <Text dimColor>
                {' '}
                {'\u2022'} Agents: {detail.components.agents.join(', ')}
              </Text>
            )}
            {detail.components.skills.length > 0 && (
              <Text dimColor>
                {' '}
                {'\u2022'} Skills: {detail.components.skills.join(', ')}
              </Text>
            )}
            {detail.components.mcpServers.length > 0 && (
              <Text dimColor>
                {' '}
                {'\u2022'} MCP Servers:{' '}
                {detail.components.mcpServers.join(', ')}
              </Text>
            )}
          </Box>
        )}
      <Box flexDirection="column" marginBottom={1}>
        {menuItems.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Box key={item.key}>
              <Text
                bold={isSelected}
                color={
                  isSelected
                    ? UI_COLORS.ASK_PRIMARY
                    : (item.color as any) || 'white'
                }
              >
                {isSelected ? '\u276F ' : '  '}
                {item.label}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box>
        <Text dimColor>
          Navigate: {'\u2191\u2193'} · Select: Enter · Back: Esc
        </Text>
      </Box>
    </Box>
  );
};

const InstalledView: React.FC<{
  onExit: (msg: string) => void;
  onSubViewChange?: (active: boolean) => void;
  onPluginChange?: () => void;
}> = ({ onExit, onSubViewChange, onPluginChange }) => {
  const { bridge, cwd } = useAppStore();
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detailPlugin, setDetailPlugin] = useState<InstalledPlugin | null>(
    null,
  );

  const openDetail = (plugin: InstalledPlugin) => {
    setDetailPlugin(plugin);
    onSubViewChange?.(true);
  };

  const closeDetail = () => {
    setDetailPlugin(null);
    onSubViewChange?.(false);
  };

  const loadPlugins = useCallback(async () => {
    try {
      const result = await bridge.request('plugin.list', { cwd });
      if (result.success) {
        setPlugins(result.data.plugins);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [bridge, cwd]);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  useInput(
    (input, key) => {
      if (key.upArrow && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
      if (key.downArrow && selectedIndex < sortedPlugins.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
      if (input === ' ' && sortedPlugins.length > 0) {
        const plugin = sortedPlugins[selectedIndex];
        const method = plugin.enabled ? 'plugin.disable' : 'plugin.enable';
        bridge
          .request(method, {
            cwd,
            pluginName: plugin.name,
            marketplace: plugin.marketplace,
          })
          .then(() => {
            loadPlugins();
            onPluginChange?.();
          });
      }
      if (key.return && sortedPlugins.length > 0) {
        openDetail(sortedPlugins[selectedIndex]);
      }
      if (input === 'r' && sortedPlugins.length > 0) {
        const p = sortedPlugins[selectedIndex];
        bridge
          .request('plugin.uninstall', {
            cwd,
            pluginName: p.name,
            marketplace: p.marketplace,
          })
          .then(() => {
            loadPlugins();
            setSelectedIndex(Math.max(0, selectedIndex - 1));
            onPluginChange?.();
          });
      }
    },
    { isActive: !detailPlugin },
  );

  if (detailPlugin) {
    return (
      <InstalledPluginDetailView
        plugin={detailPlugin}
        onBack={() => {
          closeDetail();
          loadPlugins();
        }}
        onExit={onExit}
        onPluginChange={onPluginChange}
      />
    );
  }

  if (loading) {
    return (
      <Box>
        <Spinner type="dots" />
        <Text> Loading installed plugins...</Text>
      </Box>
    );
  }

  if (plugins.length === 0) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color={UI_COLORS.ASK_PRIMARY}>
            Installed plugins
          </Text>
        </Box>
        <Text dimColor>No plugins installed.</Text>
      </Box>
    );
  }

  const scopeLabel: Record<string, string> = {
    global: 'User',
    project: 'Project',
    local: 'Local',
  };

  const scopeOrder = ['global', 'project', 'local'] as const;
  const sortedPlugins = scopeOrder.flatMap((s) =>
    plugins.filter((p) => p.scope === s),
  );
  const grouped = scopeOrder
    .map((s) => ({
      scope: s,
      label: scopeLabel[s],
      items: sortedPlugins.filter((p) => p.scope === s),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Box flexDirection="column">
      {(() => {
        let idx = 0;
        return grouped.map((g, gi) => (
          <Box key={g.scope} flexDirection="column" marginTop={gi > 0 ? 1 : 0}>
            <Box>
              <Text dimColor> {g.label}</Text>
            </Box>
            {g.items.map((p) => {
              const currentIdx = idx++;
              const isSelected = currentIdx === selectedIndex;
              return (
                <Box key={`${p.name}-${p.marketplace || ''}`}>
                  <Text color={isSelected ? UI_COLORS.ASK_PRIMARY : 'white'}>
                    {isSelected ? '\u276F ' : '  '}
                  </Text>
                  <Text
                    bold
                    color={isSelected ? UI_COLORS.ASK_PRIMARY : 'white'}
                  >
                    {p.name}
                  </Text>
                  <Text dimColor>
                    {p.marketplace ? ` · ${p.marketplace}` : ''}
                  </Text>
                  <Text> · </Text>
                  {p.enabled ? (
                    <Text color="green">{'\u2714'} enabled</Text>
                  ) : (
                    <Text dimColor>{'\u25CB'} disabled</Text>
                  )}
                  {p.pendingUpdate && (
                    <Text color="yellow"> {'\u2191'} update pending</Text>
                  )}
                </Box>
              );
            })}
          </Box>
        ));
      })()}
      <Box marginTop={1}>
        <Text dimColor>
          {selectedIndex + 1}/{sortedPlugins.length} · Space: toggle · Enter:
          details · r: remove · Esc: back
        </Text>
      </Box>
    </Box>
  );
};

const MarketplacesView: React.FC<{
  onExit: (msg: string) => void;
  onSubViewChange?: (active: boolean) => void;
  onPluginChange?: () => void;
}> = ({ onExit, onSubViewChange, onPluginChange }) => {
  const { bridge, cwd, productName } = useAppStore();
  const [marketplaces, setMarketplaces] = useState<MarketplaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addMode, setAddMode] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const items = [
    { type: 'add' as const },
    ...marketplaces.map((m) => ({ type: 'marketplace' as const, data: m })),
  ];

  const loadMarketplaces = useCallback(async () => {
    try {
      const result = await bridge.request('plugin.marketplace.list', { cwd });
      if (result.success) {
        setMarketplaces(result.data.marketplaces);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [bridge, cwd]);

  useEffect(() => {
    loadMarketplaces();
  }, [loadMarketplaces]);

  const enterAddMode = () => {
    setAddMode(true);
    onSubViewChange?.(true);
  };

  const exitAddMode = () => {
    setAddMode(false);
    setAddInput('');
    setAddError(null);
    setAdding(false);
    onSubViewChange?.(false);
  };

  useInput(
    (input, key) => {
      if (key.upArrow && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
      if (key.downArrow && selectedIndex < items.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
      if (key.return) {
        const item = items[selectedIndex];
        if (item.type === 'add') {
          enterAddMode();
        }
      }
      if (input === 'u' && selectedIndex > 0 && !updating) {
        const item = items[selectedIndex];
        if (item.type === 'marketplace') {
          setUpdating(item.data.name);
          bridge
            .request('plugin.marketplace.update', {
              cwd,
              name: item.data.name,
            })
            .then((result) => {
              setUpdating(null);
              if (result.success && result.data) {
                const updated = result.data.updatedPlugins || [];
                const failed = result.data.failedPlugins || [];

                if (updated.length > 0 || failed.length > 0) {
                  onPluginChange?.();
                  let message = `Updated marketplace ${item.data.name}`;
                  if (updated.length > 0) {
                    message += ` - ${updated.length} plugin(s) updated: ${updated.join(', ')}`;
                  }
                  if (failed.length > 0) {
                    message += ` - ${failed.length} plugin(s) failed: ${failed.map((f) => f.name).join(', ')}`;
                  }
                  message += `. Restart ${productName} to apply changes.`;
                  onExit(message);
                } else {
                  loadMarketplaces();
                }
              }
            })
            .catch(() => {
              setUpdating(null);
            });
        }
      }
      if (input === 'r' && selectedIndex > 0) {
        const item = items[selectedIndex];
        if (item.type === 'marketplace') {
          bridge
            .request('plugin.marketplace.remove', {
              cwd,
              name: item.data.name,
            })
            .then(() => {
              loadMarketplaces();
              setSelectedIndex(Math.max(0, selectedIndex - 1));
            });
        }
      }
    },
    { isActive: !addMode },
  );

  useInput(
    (_input, key) => {
      if (key.escape) {
        exitAddMode();
      }
    },
    { isActive: adding },
  );

  if (loading) {
    return (
      <Box>
        <Spinner type="dots" />
        <Text> Loading marketplaces...</Text>
      </Box>
    );
  }

  if (addMode) {
    return (
      <Box flexDirection="column" width="100%">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingLeft={1}
          paddingRight={1}
          width="100%"
        >
          <Text bold>Add Marketplace</Text>
          <Box marginTop={1} flexDirection="column">
            <Text bold>Enter marketplace source:</Text>
            <Text dimColor>Examples:</Text>
            <Text dimColor> {'\u2022'} owner/repo (GitHub)</Text>
            <Text dimColor>
              {' '}
              {'\u2022'} git@github.com:owner/repo.git (SSH)
            </Text>
            <Text dimColor>
              {' '}
              {'\u2022'} https://example.com/marketplace.json
            </Text>
            <Text dimColor> {'\u2022'} ./path/to/marketplace</Text>
          </Box>
          <Box marginTop={1}>
            <TextInput
              focus={!adding}
              multiline={false}
              value={addInput}
              placeholder=""
              onChange={(v) => {
                setAddInput(v.replace(/\n/g, ''));
                if (addError) setAddError(null);
              }}
              onPaste={async (text) => {
                setAddInput(text.replace(/\n/g, ''));
                if (addError) setAddError(null);
                return {};
              }}
              onSubmit={() => {
                if (addInput.trim() && !adding) {
                  setAdding(true);
                  setAddError(null);
                  bridge
                    .request('plugin.marketplace.add', {
                      cwd,
                      source: addInput.trim(),
                    })
                    .then((result) => {
                      if (result.success) {
                        exitAddMode();
                        loadMarketplaces();
                      } else {
                        setAddError(
                          result.error || 'Failed to add marketplace.',
                        );
                        setAdding(false);
                      }
                    })
                    .catch((err) => {
                      setAddError(
                        err instanceof Error ? err.message : String(err),
                      );
                      setAdding(false);
                    });
                }
              }}
              onEscape={() => {
                exitAddMode();
              }}
            />
          </Box>
          {adding &&
            (() => {
              const src = addInput.trim();
              const isGit =
                /^(git@|git:\/\/|https?:\/\/)/.test(src) ||
                /^[^/]+\/[^/]+$/.test(src);
              return (
                <Box marginTop={1}>
                  <Spinner type="dots" />
                  <Text>
                    {isGit
                      ? ` Cloning repository: ${src}`
                      : ` Adding marketplace...`}
                  </Text>
                </Box>
              );
            })()}
          {addError && (
            <Box marginTop={1}>
              <Text color="red">{addError}</Text>
            </Box>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            {adding ? 'escape to cancel' : 'Enter to add · escape to cancel'}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Manage marketplaces</Text>
      </Box>
      <Box flexDirection="column">
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          if (item.type === 'add') {
            return (
              <Box key="add">
                <Text color={isSelected ? UI_COLORS.ASK_PRIMARY : 'white'}>
                  {isSelected ? '\u276F ' : '  '}+ Add Marketplace
                </Text>
              </Box>
            );
          }
          const m = item.data;
          const sourceStr = m.source.url;
          return (
            <Box
              key={`${m.name}-${sourceStr}`}
              flexDirection="column"
              marginTop={1}
            >
              <Box>
                <Text color={isSelected ? UI_COLORS.ASK_PRIMARY : 'white'}>
                  {isSelected ? '\u276F ' : '  '}
                </Text>
                <Text>{pc.white('\u25CF')} </Text>
                <Text bold color={isSelected ? UI_COLORS.ASK_PRIMARY : 'white'}>
                  {m.name}
                </Text>
              </Box>
              <Box marginLeft={6} flexDirection="column">
                <Text dimColor>{sourceStr}</Text>
                <Text dimColor>
                  {m.pluginCount} available · Updated{' '}
                  {formatDate(m.lastUpdated)}
                </Text>
                {updating === m.name && (
                  <Box>
                    <Spinner type="dots" />
                    <Text color="yellow">
                      {' '}
                      Updating marketplace and plugins...
                    </Text>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          ↑↓ navigate · Enter: select · u: update · r: remove · Esc: back
        </Text>
      </Box>
    </Box>
  );
};

interface PluginManagerProps {
  onExit: (result: string) => void;
}

const PluginManagerComponent: React.FC<PluginManagerProps> = ({ onExit }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Discover');
  const [subViewActive, setSubViewActive] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePluginChange = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const cycleTab = (direction: 1 | -1) => {
    const idx = TABS.indexOf(activeTab);
    const next = (idx + direction + TABS.length) % TABS.length;
    setActiveTab(TABS[next]);
  };

  useInput(
    (input, key) => {
      if (key.escape) {
        onExit('Plugin manager closed.');
        return;
      }
      if (key.tab || key.rightArrow) {
        cycleTab(1);
      }
      if (key.leftArrow) {
        cycleTab(-1);
      }
    },
    { isActive: !subViewActive },
  );

  return (
    <Box flexDirection="column">
      <TabBar activeTab={activeTab} />
      <Box marginTop={1}>
        {activeTab === 'Discover' && (
          <DiscoverView
            onExit={onExit}
            onSubViewChange={setSubViewActive}
            refreshTrigger={refreshTrigger}
            onPluginChange={handlePluginChange}
          />
        )}
        {activeTab === 'Installed' && (
          <InstalledView
            onExit={onExit}
            onSubViewChange={setSubViewActive}
            onPluginChange={handlePluginChange}
          />
        )}
        {activeTab === 'Marketplaces' && (
          <MarketplacesView
            onExit={onExit}
            onSubViewChange={setSubViewActive}
            onPluginChange={handlePluginChange}
          />
        )}
      </Box>
    </Box>
  );
};

function parsePluginIdentifier(identifier: string): {
  pluginName: string;
  marketplace: string;
} | null {
  const atIndex = identifier.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === identifier.length - 1) return null;
  return {
    pluginName: identifier.slice(0, atIndex),
    marketplace: identifier.slice(atIndex + 1),
  };
}

function extractScope(tokens: string[]): {
  remaining: string[];
  scope: 'user' | 'project' | 'local';
} {
  const scopeIndex = tokens.indexOf('--scope');
  if (scopeIndex === -1 || scopeIndex >= tokens.length - 1) {
    return { remaining: tokens.filter((t) => t !== '--scope'), scope: 'user' };
  }
  const scopeValue = tokens[scopeIndex + 1] as 'user' | 'project' | 'local';
  const validScopes = ['user', 'project', 'local'];
  const remaining = [
    ...tokens.slice(0, scopeIndex),
    ...tokens.slice(scopeIndex + 2),
  ];
  if (!validScopes.includes(scopeValue)) {
    return { remaining, scope: 'user' };
  }
  return { remaining, scope: scopeValue };
}

async function handleMarketplaceCommand(
  tokens: string[],
  bridge: UIBridge,
  cwd: string,
): Promise<string> {
  const action = tokens[0];
  const target = tokens.slice(1).join(' ');

  switch (action) {
    case 'add': {
      if (!target) {
        return 'Usage: /plugin marketplace add <source>\n\nExamples:\n  /plugin marketplace add owner/repo\n  /plugin marketplace add https://gitlab.com/company/plugins.git\n  /plugin marketplace add ./my-marketplace';
      }
      try {
        const result = await bridge.request('plugin.marketplace.add', {
          cwd,
          source: target,
        });
        if (result.success && result.data) {
          return `Added marketplace "${result.data.name}" with ${result.data.pluginCount} plugin(s).`;
        }
        return result.error || 'Failed to add marketplace.';
      } catch (err) {
        return `Failed to add marketplace: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    case 'list': {
      try {
        const result = await bridge.request('plugin.marketplace.list', {
          cwd,
        });
        if (result.success && result.data.marketplaces.length > 0) {
          const lines = result.data.marketplaces.map(
            (m) =>
              `  \u2022 ${m.name} (${m.source?.url || 'unknown'}) - ${m.pluginCount} plugin(s)`,
          );
          return `Marketplaces:\n${lines.join('\n')}`;
        }
        return 'No marketplaces configured.';
      } catch (err) {
        return `Failed to list marketplaces: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    case 'update': {
      if (!target) {
        return 'Usage: /plugin marketplace update <marketplace-name>';
      }
      try {
        const result = await bridge.request('plugin.marketplace.update', {
          cwd,
          name: target,
        });
        if (result.success && result.data) {
          const updated = result.data.updatedPlugins || [];
          if (updated.length > 0) {
            return `Updated marketplace "${result.data.name}" - ${updated.length} plugin(s) updated: ${updated.join(', ')}.`;
          }
          return `Marketplace "${result.data.name}" is up to date.`;
        }
        return 'Failed to update marketplace.';
      } catch (err) {
        return `Failed to update marketplace: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    case 'remove':
    case 'rm': {
      if (!target) {
        return 'Usage: /plugin marketplace remove <marketplace-name>';
      }
      try {
        const result = await bridge.request('plugin.marketplace.remove', {
          cwd,
          name: target,
        });
        if (result.success) {
          return `Removed marketplace "${target}".`;
        }
        return result.error || `Failed to remove marketplace "${target}".`;
      } catch (err) {
        return `Failed to remove marketplace: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    default:
      return 'Usage: /plugin marketplace <add|list|update|remove> [args]\n\nCommands:\n  add <source>       Add a marketplace\n  list               List configured marketplaces\n  update <name>      Update a marketplace\n  remove <name>      Remove a marketplace';
  }
}

async function handlePluginCliCommand(
  args: string,
  bridge: UIBridge,
  cwd: string,
  productName: string,
): Promise<string> {
  const tokens = args.trim().split(/\s+/);
  const subcommand = tokens[0]?.toLowerCase();

  switch (subcommand) {
    case 'install': {
      const { remaining, scope } = extractScope(tokens.slice(1));
      const identifier = remaining[0];
      if (!identifier) {
        return 'Usage: /plugin install <name@marketplace> [--scope user|project|local]';
      }
      const parsed = parsePluginIdentifier(identifier);
      if (!parsed) {
        return 'Invalid plugin identifier. Expected format: plugin-name@marketplace-name';
      }
      try {
        const result = await bridge.request('plugin.install', {
          cwd,
          pluginName: parsed.pluginName,
          marketplaceName: parsed.marketplace,
          scope,
        });
        if (result.success) {
          return `Installed ${parsed.pluginName} from ${parsed.marketplace}. Restart ${productName} to load new plugins.`;
        }
        return result.error || `Failed to install ${identifier}.`;
      } catch (err) {
        return `Failed to install ${identifier}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    case 'uninstall': {
      const identifier = tokens[1];
      if (!identifier) {
        return 'Usage: /plugin uninstall <name@marketplace>';
      }
      const parsed = parsePluginIdentifier(identifier);
      if (!parsed) {
        return 'Invalid plugin identifier. Expected format: plugin-name@marketplace-name';
      }
      try {
        const result = await bridge.request('plugin.uninstall', {
          cwd,
          pluginName: parsed.pluginName,
          marketplace: parsed.marketplace,
        });
        if (result.success) {
          return `Uninstalled ${parsed.pluginName}@${parsed.marketplace}. Restart ${productName} to apply changes.`;
        }
        return result.error || `Failed to uninstall ${identifier}.`;
      } catch (err) {
        return `Failed to uninstall ${identifier}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    case 'enable': {
      const identifier = tokens[1];
      if (!identifier) {
        return 'Usage: /plugin enable <name@marketplace>';
      }
      const parsed = parsePluginIdentifier(identifier);
      if (!parsed) {
        return 'Invalid plugin identifier. Expected format: plugin-name@marketplace-name';
      }
      try {
        const result = await bridge.request('plugin.enable', {
          cwd,
          pluginName: parsed.pluginName,
          marketplace: parsed.marketplace,
        });
        if (result.success) {
          return `Enabled ${parsed.pluginName}@${parsed.marketplace}. Restart ${productName} to apply changes.`;
        }
        return result.error || `Failed to enable ${identifier}.`;
      } catch (err) {
        return `Failed to enable ${identifier}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    case 'disable': {
      const identifier = tokens[1];
      if (!identifier) {
        return 'Usage: /plugin disable <name@marketplace>';
      }
      const parsed = parsePluginIdentifier(identifier);
      if (!parsed) {
        return 'Invalid plugin identifier. Expected format: plugin-name@marketplace-name';
      }
      try {
        const result = await bridge.request('plugin.disable', {
          cwd,
          pluginName: parsed.pluginName,
          marketplace: parsed.marketplace,
        });
        if (result.success) {
          return `Disabled ${parsed.pluginName}@${parsed.marketplace}. Restart ${productName} to apply changes.`;
        }
        return result.error || `Failed to disable ${identifier}.`;
      } catch (err) {
        return `Failed to disable ${identifier}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    case 'marketplace':
    case 'market': {
      return handleMarketplaceCommand(tokens.slice(1), bridge, cwd);
    }
    default:
      return 'Usage: /plugin <command> [args]\n\nCommands:\n  install <name@market> [--scope user|project|local]\n  uninstall <name@market>\n  enable <name@market>\n  disable <name@market>\n  marketplace add <source>\n  marketplace list\n  marketplace update <name>\n  marketplace remove <name>\n\nRun /plugin without arguments for interactive UI.';
  }
}

export function createPluginCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'plugin',
    description: 'Manage plugins: discover, install, and configure',
    async call(
      onDone: (result: string) => void,
      _context: unknown,
      args?: string,
    ) {
      if (args?.trim()) {
        const { bridge, cwd, productName } = useAppStore.getState();
        const result = await handlePluginCliCommand(
          args,
          bridge,
          cwd,
          productName,
        );
        onDone(result);
        return null;
      }
      return <PluginManagerComponent onExit={onDone} />;
    },
  };
}
