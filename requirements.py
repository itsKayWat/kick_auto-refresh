import subprocess
import sys

def install_requirements():
    requirements = [
        'node>=14.0.0',
        'npm>=6.0.0',
        'sharp@0.32.6',  # For icon generation
        'webpack@5.x',   # For building
        'jest@27.x',     # For testing
    ]

    print("Installing requirements for Kick Auto Refresh Plus...")
    
    try:
        # Check Node.js and npm
        subprocess.run(['node', '--version'], check=True)
        subprocess.run(['npm', '--version'], check=True)
        
        # Install npm packages
        subprocess.run(['npm', 'install'], check=True)
        
        print("\n✅ All requirements installed successfully!")
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error: {e}")
        print("\nPlease ensure Node.js and npm are installed on your system.")
        sys.exit(1)

if __name__ == "__main__":
    install_requirements()