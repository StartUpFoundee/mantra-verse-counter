
import React, { useState, useEffect } from "react";
import { getUserData } from "@/utils/spiritualIdUtils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ProfileDropdown from "./ProfileDropdown";

const ProfileHeader: React.FC = () => {
  const [userData, setUserData] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  useEffect(() => {
    // Get user data from localStorage for immediate UI update
    const localUserData = getUserData();
    if (localUserData) {
      setUserData(localUserData);
    }
  }, []);

  if (!userData) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="flex items-center gap-2 p-1 hover:bg-zinc-800 rounded-full"
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <Avatar className="h-14 w-14 md:h-16 md:w-16 border-2 border-amber-600/30">
          <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xl md:text-2xl">
            {userData.symbolImage || "🕉️"}
          </AvatarFallback>
        </Avatar>
        <span className="text-amber-400 text-sm hidden sm:inline-block">
          {userData.name}
        </span>
      </Button>

      {dropdownOpen && (
        <ProfileDropdown 
          onClose={() => setDropdownOpen(false)} 
        />
      )}
    </div>
  );
};

export default ProfileHeader;
