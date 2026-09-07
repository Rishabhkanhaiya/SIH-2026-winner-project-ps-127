# Footage Directory for Urban Pulse AI

Place your downloaded video files here.

### Supported Structure 1 (CityFlow Track 1 extracted format):
```text
footage/
├── c001/
│   └── vdo.avi (or .mp4)   --> Automatically maps to CAM-001 (MG Road)
├── c002/
│   └── vdo.avi             --> Automatically maps to CAM-002 (FC Road)
├── c003/
│   └── vdo.avi             --> Automatically maps to CAM-003 (Swargate)
├── c004/
│   └── vdo.avi             --> Automatically maps to CAM-004 (Shivajinagar)
└── c005/
    └── vdo.avi             --> Automatically maps to CAM-005 (Karve Road)
```

### Supported Structure 2 (Flat format):
```text
footage/
├── cam1.mp4                --> Automatically maps to CAM-001
├── cam2.mp4                --> Automatically maps to CAM-002
└── cam3.mp4                --> Automatically maps to CAM-003
```

### How to run:
In the root directory, simply run:
```powershell
python feed_footage.py
```
