-- AppleScript to automate Windsurf model extraction
-- This script opens Windsurf, opens DevTools, and injects JavaScript

tell application "Windsurf"
    activate
    delay 2
end tell

tell application "System Events"
    tell process "Windsurf"
        -- Open Developer Tools (Cmd+Option+I)
        keystroke "i" using {command down, option down}
        delay 2
        
        -- Paste JavaScript code to console
        set jsCode to "const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const url = String(args[0]);
  if (url.includes('model')) {
    const clone = response.clone();
    try {
      const json = await clone.json();
      console.log('MODELS:', JSON.stringify(json, null, 2));
    } catch(e) {}
  }
  return response;
};
console.log('Interceptor active. Click model dropdown!');"
        
        -- Type the JavaScript (this is fragile, but worth a try)
        keystroke jsCode
        keystroke return
        
        delay 1
        
        -- Now we need to click the model dropdown
        -- This is challenging without knowing exact UI coordinates
        -- May need user to do this part
        
    end tell
end tell

display dialog "JavaScript injected! Now click the model dropdown in Cascade panel." buttons {"OK"} default button "OK"
