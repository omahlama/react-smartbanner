import React, { Component, PropTypes } from 'react';
import ua from 'ua-parser-js';
import cookie from 'cookie-cutter';

import '../styles/style.scss';

class SmartBanner extends Component {
  constructor(props) {
    super(props);

    this.state = {
      type: '',
      appId: '',
      settings: {},
    };
  }

  static propTypes = {
    daysHidden: PropTypes.number,
    daysReminder: PropTypes.number,
    appStoreLanguage: PropTypes.string,
    button: PropTypes.string,
    storeText: PropTypes.objectOf(PropTypes.string),
    price: PropTypes.objectOf(PropTypes.string),
    force: PropTypes.string,
    title: PropTypes.string,
    author: PropTypes.string,
  };

  static defaultProps = {
    daysHidden: 15,
    daysReminder: 90,
    appStoreLanguage: typeof window !== 'undefined' && (window.navigator.language.slice(-2) ||
      window.navigator.userLanguage.slice(-2)) || 'us',
    button: 'View',
    storeText: {
      ios: 'On the App Store',
      android: 'In Google Play',
      windows: 'In Windows Store',
    },
    price: {
      ios: 'Free',
      android: 'Free',
      windows: 'Free',
    },
    force: '',
    title: '',
    author: '',
  };

  componentWillMount() {
    this.setType(this.props.force);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.force !== this.props.force) {
      this.setType(nextProps.force);
    }
  }

  setType(deviceType) {
    let type = '';
    if (deviceType) { // force set case
      type = deviceType;
    } else {
      const agent = ua(window.navigator.userAgent);
      if (agent.os.name === 'Windows Phone' || agent.os.name === 'Windows Mobile') {
        type = 'windows';
      // iOS >= 6 has native support for Smart Banner
      } else if (agent.os.name === 'iOS' && parseInt(agent.os.version, 10) < 6) {
        type = 'ios';
      } else if (agent.os.name === 'Android') {
        type = 'android';
      }
    }

    this.setState({
      type,
    }, () => {
      if (type) {
        this.setSettingsByType();
      }
    });
  }

  parseAppId() {
    const meta = typeof window !== 'undefined' && window.document.querySelector(
      `meta[name="${this.state.settings.appMeta}"]`);

    if (!meta) {
      return '';
    }

    let appId = '';
    if (this.state.type === 'windows') {
      appId = meta.getAttribute('content');
    } else {
      appId = /app-id=([^\s,]+)/.exec(meta.getAttribute('content'))[1];
    }

    this.setState({
      appId,
    });

    return appId;
  }

  setSettingsByType() {
    const mixins = {
      ios: {
        appMeta: 'apple-itunes-app',
        iconRels: ['apple-touch-icon-precomposed', 'apple-touch-icon'],
        getStoreLink: () =>
          `https://itunes.apple.com/${this.props.appStoreLanguage}/app/id`,
      },
      android: {
        appMeta: 'google-play-app',
        iconRels: ['android-touch-icon', 'apple-touch-icon-precomposed', 'apple-touch-icon'],
        getStoreLink: () =>
          'http://play.google.com/store/apps/details?id=',
      },
      windows: {
        appMeta: 'msApplication-ID',
        iconRels: ['windows-touch-icon', 'apple-touch-icon-precomposed', 'apple-touch-icon'],
        getStoreLink: () =>
          'http://www.windowsphone.com/s?appid=',
      },
    };

    this.setState({
      settings: mixins[this.state.type],
    }, () => {
      if (this.state.type) {
        this.parseAppId();
      }
    });
  }

  hide() {
    window.document.querySelector('html').classList.remove('smartbanner-show');
  }

  show() {
    window.document.querySelector('html').classList.add('smartbanner-show');
  }

  close() {
    this.hide();
    cookie.set('smartbanner-closed', 'true', {
      path: '/',
      expires: +new Date() + this.props.daysHidden * 1000 * 60 * 60 * 24,
    });
  }

  install() {
    this.hide();
    cookie.set('smartbanner-installed', 'true', {
      path: '/',
      expires: +new Date() + this.props.daysReminder * 1000 * 60 * 60 * 24,
    });
  }

  retrieveInfo() {
    const link = this.state.settings.getStoreLink() + this.state.appId;
    const inStore = `
      ${this.props.price[this.state.type]} - ${this.props.storeText[this.state.type]}`;
    let icon;

    for (let i = 0, max = this.state.settings.iconRels.length; i < max; i++) {
      const rel = window.document.querySelector(
        `link[rel="${this.state.settings.iconRels[i]}"]`);

      if (rel) {
        icon = rel.getAttribute('href');
        break;
      }
    }

    return {
      icon,
      link,
      inStore,
    };
  }

  render() {
    // Don't show banner when:
    // 1) if device isn't iOS or Android
    // 2) website is loaded in app,
    // 3) user dismissed banner,
    // 4) or we have no app id in meta
    if (!this.state.type
      || typeof window === 'undefined'
      || window.navigator.standalone
      || cookie.get('smartbanner-closed')
      || cookie.get('smartbanner-installed')) {
      return null;
    }

    if (!this.state.appId) {
      return null;
    }

    this.show();

    const { icon, link, inStore } = this.retrieveInfo();
    const wrapperClassName = `smartbanner smartbanner-${this.state.type}`;
    const iconStyle = {
      backgroundImage: `url(${icon})`,
    };

    return (
      <div className={wrapperClassName}>
        <div className="smartbanner-container">
          <a className="smartbanner-close" onClick={::this.close}>&times;</a>
          <span className="smartbanner-icon" style={iconStyle}></span>
          <div className="smartbanner-info">
            <div className="smartbanner-title">{this.props.title}</div>
            <div>{this.props.author}</div>
            <span>{inStore}</span>
          </div>

          <a href={link} onClick={::this.install} className="smartbanner-button">
            <span className="smartbanner-button-text">{this.props.button}</span>
          </a>
        </div>
      </div>
    );
  }
}

export default SmartBanner;
