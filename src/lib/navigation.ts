type BasicRouter = {
    canGoBack: () => boolean;
    back: () => void;
    replace: (href: any) => void;
};

export function goBackOrReplace(router: BasicRouter, fallbackHref: any) {
    if (router.canGoBack()) {
        router.back();
        return;
    }

    router.replace(fallbackHref);
}
