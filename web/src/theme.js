export const themeConfig = {
  token: {
    colorPrimary: '#F45B8D',
    colorPrimaryHover: '#FF7BA9',
    colorPrimaryActive: '#DC4678',
    colorInfo: '#369ED8',
    colorSuccess: '#52A86B',
    colorWarning: '#ED7048',
    colorError: '#E5484D',
    colorBgLayout: '#FFFFFF',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBorderSecondary: '#ECEEF2',
    colorText: '#252330',
    colorTextSecondary: '#858291',
    colorTextTertiary: '#A6A3B3',
    borderRadius: 10,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    fontFamily:
      "'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans SC',-apple-system,sans-serif",
    boxShadow: '0 1px 2px rgba(20, 22, 34, 0.04), 0 4px 12px rgba(20, 22, 34, 0.04)',
    boxShadowSecondary: '0 6px 20px rgba(20, 22, 34, 0.08)',
    controlHeight: 40,
    fontSize: 14,
  },
  components: {
    Button: {
      borderRadius: 10,
      borderRadiusLG: 10,
      fontWeight: 600,
      primaryShadow: '0 4px 10px rgba(244, 91, 141, 0.25)',
    },
    Card: {
      borderRadiusLG: 16,
      paddingLG: 20,
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Menu: {
      itemBorderRadius: 8,
    },
    Input: {
      borderRadius: 10,
      borderRadiusLG: 10,
    },
    Select: {
      borderRadius: 10,
      borderRadiusLG: 10,
    },
  },
}
