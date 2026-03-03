import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import pc from 'picocolors';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { UI_COLORS } from '../../ui/constants';
import TextInput from '../../ui/TextInput/index.js';
import { useTerminalSize } from '../../ui/useTerminalSize';
import { useAppStore } from '../../ui/store';
import type { LocalJSXCommand } from '../types';

const TABS = ['Discover', 'Installed', 'Marketplaces'] as const;
type Tab = (typeof TABS)[number];

interface DiscoverPlugin {
  name: string;
  description?: string;
  marketplace: string;
  category?: string;
  tags?: string[];
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

const DETAIL_MENU_ITEMS = [
  { key: 'user', label: 'Install for you (user scope)' },
  {
    key: 'project',
    label: 'Install for all collaborators on this repository (project scope)',
  },
  { key: 'local', label: 'Install for you, in this repo only (local scope)' },
  // { key: 'homepage', label: 'Open homepage' },
  { key: 'back', label: 'Back to plugin list' },
] as const;

const PluginDetailView: React.FC<{
  plugin: DiscoverPlugin;
  onBack: () => void;
  onInstall: (scope: 'user' | 'project' | 'local') => void;
}> = ({ plugin, onBack, onInstall }) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
    if (key.downArrow && selectedIndex < DETAIL_MENU_ITEMS.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
    if (key.return) {
      const item = DETAIL_MENU_ITEMS[selectedIndex];
      if (item.key === 'back') {
        onBack();
      } else {
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
          using it. Anthropic does not control what MCP servers, files, or other
          software are included in plugins and cannot verify that they will work
          as intended or that they won't change. See each plugin's homepage for
          more information.
        </Text>
      </Box>
      <Box flexDirection="column">
        {DETAIL_MENU_ITEMS.map((item, i) => {
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
            .then(() => {
              onExit(
                `Installed ${detailPlugin.name}. Restart ${productName} to load new plugins.`,
              );
            })
            .catch(() => {
              setInstalling(null);
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
    { key: 'mark-update', label: 'Mark for update' },
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
          .then(() => {
            onExit(
              `Updated ${plugin.name}. Restart ${productName} to apply changes.`,
            );
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
      if (key.downArrow && selectedIndex < plugins.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
      if (input === ' ' && plugins.length > 0) {
        const plugin = plugins[selectedIndex];
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
      if (key.return && plugins.length > 0) {
        openDetail(plugins[selectedIndex]);
      }
      if (input === 'r' && plugins.length > 0) {
        const p = plugins[selectedIndex];
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
  const grouped = scopeOrder
    .map((s) => ({
      scope: s,
      label: scopeLabel[s],
      items: plugins.filter((p) => p.scope === s),
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
                </Box>
              );
            })}
          </Box>
        ));
      })()}
      <Box marginTop={1}>
        <Text dimColor>
          {selectedIndex + 1}/{plugins.length} · Space: toggle · Enter: details
          · r: remove · Esc: back
        </Text>
      </Box>
    </Box>
  );
};

const MarketplacesView: React.FC<{
  onExit: (msg: string) => void;
  onSubViewChange?: (active: boolean) => void;
}> = ({ onExit, onSubViewChange }) => {
  const { bridge, cwd } = useAppStore();
  const [marketplaces, setMarketplaces] = useState<MarketplaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addMode, setAddMode] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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
      if (input === 'u' && selectedIndex > 0) {
        const item = items[selectedIndex];
        if (item.type === 'marketplace') {
          bridge
            .request('plugin.marketplace.update', {
              cwd,
              name: item.data.name,
            })
            .then(() => loadMarketplaces());
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
          />
        )}
      </Box>
    </Box>
  );
};

export function createPluginCommand(): LocalJSXCommand {
  return {
    type: 'local-jsx',
    name: 'plugin',
    description: 'Manage plugins: discover, install, and configure',
    async call(onDone: (result: string) => void) {
      return <PluginManagerComponent onExit={onDone} />;
    },
  };
}
