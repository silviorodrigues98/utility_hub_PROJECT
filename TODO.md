- [ ] Fix: Sound trigger in keep-alive mode
    - [ ] Issue: Audio does not play when triggered automatically, only on direct user interaction.
    - [ ] Potential Cause: Browser autoplay policies blocking non-user-initiated audio.
    - [ ] Solution: Ensure the `AudioContext` is initialized or resumed during the initial user "activate" click and stored for subsequent use by the keep-alive trigger.

- [ ] Feature: Context-aware extension popup
    - [ ] Description: Automatically open the active feature's window (e.g., Auto Reload) instead of the home screen when the extension is clicked.
    - [ ] Implementation: Track the active feature state and update the extension's default popup or redirect on load.



