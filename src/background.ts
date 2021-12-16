declare const __DEV__: boolean

// chrome.windows.getAll({  }, (windows) => console.log(windows))
if (__DEV__)
    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
        if (tabs.length === 0) return
        await chrome.tabs.reload(tabs[0]!.id!)
    })
