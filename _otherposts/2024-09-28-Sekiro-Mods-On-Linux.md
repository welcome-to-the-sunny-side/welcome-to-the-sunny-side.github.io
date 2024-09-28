---
layout: post
title: Installing Sekiro mods on linux
tags:
---

Sekiro mods are a bit finnicky on linux. Assuming that you have Wine, Winetricks, Lutris, and Sekiro installed, here is how you can get them to run:

- Paste the "Sekiro mod engine" files into your Sekiro directory (where `sekiro.exe` is located).
- Create a folder called "ftsoa" (or whatever) and place it in the same directory. Place the files for your mod inside this folder.
- Edit `modengine.ini` (which you pasted in step 1) and set the variable `modOverrideDirectory` to "\ftsoa" (or whatever you named it to).
- Open Winetricks for the relevant wineprefix, go to `library`, and add an override for `dinput8.dll`.
- Now, launch Lutris, go to Sekiro's configuration, and set `Working Directory` to the same directory as the one where `sekiro.exe` is located.
- Enjoy.