let ysdk = null;

export async function initYSDK() {
    if (typeof YaGames === 'undefined') {
        console.warn('Yandex SDK не загружен (локальный режим)');
        return null;
    }

    try {
        ysdk = await YaGames.init();
        
        const lang = ysdk.environment.i18n.lang;
        console.log('Язык пользователя:', lang);

        if (ysdk.screen) {
            ysdk.screen.orientation = 'portrait';
        }

        return ysdk;
    } catch (e) {
        console.error('Ошибка инициализации Yandex SDK:', e);
        return null;
    }
}

export function gameReady() {
    if (ysdk && ysdk.features && ysdk.features.LoadingAPI) {
        ysdk.features.LoadingAPI.ready();
        console.log('Game Ready отправлен');
    }
}

// Реклама за вознаграждение (rewarded video)
export function showRewardAd(onSuccess, onFail) {
    if (!ysdk) {
        console.log('SDK нет, выдаём награду без рекламы');
        onSuccess();
        return;
    }

    ysdk.adv.showRewardedVideo({
        callbacks: {
            onOpen: () => {
                console.log('Реклама открыта');
            },
            onRewarded: () => {
                console.log('Награда получена');
                onSuccess();
            },
            onClose: () => {
                console.log('Реклама закрыта');
            },
            onError: (error) => {
                console.error('Ошибка рекламы:', error);
                onFail();
            }
        }
    });
}

// Полноэкранная реклама (interstitial)
export function showInterstitial(onClose) {
    if (!ysdk) {
        // Локально просто вызываем коллбэк
        if (onClose) onClose();
        return;
    }

    ysdk.adv.showFullscreenAdv({
        callbacks: {
            onOpen: () => {
                console.log('Интерстишл открыт');
            },
            onClose: (wasShown) => {
                console.log('Интерстишл закрыт, shown:', wasShown);
                if (onClose) onClose();
            },
            onError: (error) => {
                console.error('Ошибка интерстишла:', error);
                if (onClose) onClose();
            }
        }
    });
}