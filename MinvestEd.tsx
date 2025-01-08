import React, { useState, useEffect, useRef } from "react";
import ReactHtmlParser from 'react-html-parser';
import moduleFile from './modules.json';
import { useAuth0 } from "@auth0/auth0-react";
import {
  Box,
  Divider,
  Flex,
  Image,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Center,
  Icon,
  Grid,
  SimpleGrid,
  Wrap,
  WrapItem,
  GridItem,
  useMediaQuery
} from "@chakra-ui/react";

const typedModuleFile = moduleFile as {
  [key: string]: Array<{
    name: string;
    img: string;
    type: string;
    duration: string;
    source?: string;
    content?: string;
    questions?: any;
    answers?: string[]
  }>;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < window.innerHeight);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    handleResize();  // Initial check on component mount
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}


function loadContent(path: string) {
  const [content, setContent] = useState('');

    fetch(path)
      .then(response => response.text())
      .then(text => setContent(text));
  

  return (
      content
  );
}

const MinvestEd: React.FC = () => {
  type Module = {
    name: string;
    img: string;
    type: string;
    duration: string;
    source?: string;
    content?: string;
    questions?: any;
    answers?: string[]
  };

  type Question = {
    question: string,
    options: string[],
  }

  type moduleFile = {
    [key: string]: Module[];
  };

  const typedModuleFile = moduleFile as moduleFile;

  const contentRef = useRef<HTMLDivElement | null>(null);


  const { user, loginWithRedirect } = useAuth0();
  const [userProgress, setUserProgress] = useState<any>({});
  const [userPoints, setUserPoints] = useState(0);
  const [currentModule, setCurrentModule] = useState<Module>(
    {
      name: "mt",
      img: "mt",
      duration: "mt",
      type: "mt",
    }
  )

  const [completedVideos, setCompletedVideos] = useState<string[]>([]);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [contentPath, setContentPath] = useState<string>("");
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoSource, setVideoSource] = useState<string>("");
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [topShadow, setTopShadow] = useState(false);
  const [bottomShadow, setBottomShadow] = useState(true);
  const isMobile = useIsMobile();
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<keyof typeof typedModuleFile>("What is investing?");
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);


  const setModalStates = (item: Module) => {
    if (item.name == "close") {
      setIsLessonModalOpen(false)
      setIsVideoModalOpen(false)
      setIsQuizModalOpen(false)
    }
    else {
      setCurrentModule(item)
      if (item.type == "article") {
        setContentPath(item.content!)
        setIsLessonModalOpen(true)
      }
      else if (item.type == "video") {
        setVideoSource(item.source!)
        setIsVideoModalOpen(true)
      }
      else if (item.type == "quiz") {
        setQuizQuestions(item.questions)
        setQuizAnswers(item.answers!)
        setIsQuizModalOpen(true)
      }
    }
  };




  const handleCloseModal = () => {
    setSelectedAnswers([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    setQuizResult("");
    setModalStates({ name: "close", img: "", duration: "", type: "" });
  };

  const mobileScrollbarStyle = {
    '&::-webkit-scrollbar': {
      width: '4px',
    },
    '&::-webkit-scrollbar-track': {
      background: '#f0f0f0',
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#888',
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: '#555',
    },
  };

  const desktopScrollbarStyle = {
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: '#f0f0f0',
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#888',
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: '#555',
    },
  };

  const handleScroll = () => {
    const element = contentRef.current;
    if (element) {
      const { scrollTop, scrollHeight, clientHeight } = element;
      setTopShadow(scrollTop > 0);
      setBottomShadow(scrollTop + clientHeight < scrollHeight - 20);
    }
  };

  useEffect(() => {
    const element = contentRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, []);


  const [quizResult, setQuizResult] = useState<string>("");

  const getButtonColor = (questionIndex: number, buttonOption: string): string => {
    if (selectedAnswers[questionIndex] == "" || selectedAnswers[questionIndex] != buttonOption) {
      return "transparent"
    }

    const correctAnswer = quizAnswers![questionIndex];
    return buttonOption === correctAnswer ? "green" : "red";
  };

  const [submittedAnswers, setSubmittedAnswers] = useState<boolean[]>(quizQuestions.map(() => false));


  const handleAnswerSelect = (questionIndex: number, selectedAnswer: string) => {
    if (selectedAnswers[questionIndex] !== "") return; // Prevent changing the answer if already selected

    const newAnswers = selectedAnswers.map((answer, i) => {
      return i === questionIndex ? selectedAnswer : answer;
    });

    const newSubmittedAnswers = submittedAnswers.map((submitted, i) => {
      return i === questionIndex ? true : submitted;
    });

    setSelectedAnswers(newAnswers);
    setSubmittedAnswers(newSubmittedAnswers);
  };


  const handleQuizSubmit = () => {

    // calculate score
    let score = 0;
    for (let i = 0; i < quizAnswers.length; i++) {
      if (selectedAnswers[i] == quizAnswers[i]) {
        score++;
      }
    }

    // Display the dynamic score
    const totalQuestions = Object.keys(quizAnswers!).length;
    const percentageCorrect = (score / totalQuestions) * 100;

    updateProgress(percentageCorrect)

    
    //Points for quizes
    if (!Object.keys(userProgress).includes(currentModule.name)) {
      setUserPoints(userPoints + percentageCorrect);
    }
    // Display the dynamic score 
    setQuizResult(`Score: ${score}/${totalQuestions}`);
  
  };


  
  async function fetchUserMetadata() {
    console.log("fetching usermetadata");
    try {
        // const response = await fetch("https://beta.minvestfinance.com:3001/get-user-metadata", {
        const response = await fetch("http://localhost:3001/get-user-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.sub,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (!data.userMetadata.progress) {
          data.userMetadata.progress = {}
          console.log("progress was undefined, setting an empty dictionary...")
        }

        if (!data.userMetadata.points) {
          data.userMetadata.points = (Object.keys(data.userMetadata.progress).length*25)
          console.log("points was undefined, giving them points based on how much they've completed...")
        }

        setUserProgress(data.userMetadata.progress);
        setUserPoints(data.userMetadata.points);

        console.log("response from fetch (progress value):", data.userMetadata.progress);
      } else {
        throw new Error("Failed to fetch user metadata");
      }

    } catch (error) {
      console.error("Error fetching user metadata:", error);
    }
  }


  // get user progress on 1st render
  useEffect(() => {
    fetchUserMetadata();
  }, []);

  function updateProgress(progress: number) {
    setUserProgress({
      ...userProgress,
      [currentModule.name]: progress
    });
  }



  
  
  function updateArticleProgress() {
    if (userProgress[currentModule.name] == 100) {
      setUserProgress({
        ...userProgress,
        [currentModule.name]: 0
      });
      //remove points for incomplete articles
      setUserPoints(userPoints-25);
    } else {
      setUserProgress({
        ...userProgress,
        [currentModule.name]: 100
      });
      //add points for complete articles
      setUserPoints(userPoints+25);
    }

    handleCloseModal();
  }


  // save user's progress everytime it updates 
  useEffect(() => {
    saveProgress();
  }, [userProgress, userPoints]);


  function calculateSectionProgress(section: string) {
    let total = 0
    for (let i = 0; i < typedModuleFile[section].length; i++) {
      if (userProgress[typedModuleFile[section][i].name]) {
        total += userProgress[typedModuleFile[section][i].name]
      }

    }

    return total / (typedModuleFile[section].length)
  }


  async function saveProgress() {
    // updateSectionProgress()
    try {
        // const response = await fetch("https://beta.minvestfinance.com:3001/update-user-progress-points", {
        const response = await fetch("http://localhost:3001/update-user-progress-points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user!.sub,
          userProgress,
          userPoints
        }),
      });

      if (response.ok) {
        console.log("Profile updated successfully!");
      } else {
        throw new Error("Failed to update profile");
      }

    } catch (error) {
      console.error("Error updating user metadata:", error);
    }
  }

  

  function renderSections() {
    let sections = []

    for (let section in typedModuleFile) {
      sections.push(
        <Box mb={7} mt={5} ml={5} mr={5} key={section}>
          <Text
            bg="transparent"
            color="#B369FD"
            textAlign="left"
            fontWeight="extrabold"
            fontSize="xl"
          >
            {section}
          </Text>

          <Flex align="center" mt={0}>
            <Box
              flex="1"
              height="5px"
              bg="gray.700"
              borderRadius="full"
              overflow="hidden"
            >
              <Box
                width={`${calculateSectionProgress(section)}%`}
                height="100%"
                bg={calculateSectionProgress(section) >= 100 ? "green.400" : "purple.400"}
                borderRadius="full"
                transition="width 0.3s ease-in-out"
              />
            </Box>
            <Text ml={3} fontSize="sm" fontWeight="bold" color="gray.300" width="50px" textAlign="right">
              {`${Math.round(calculateSectionProgress(section))}%`}
            </Text>
          </Flex>

          <Wrap spacing={["10px", "15px", "20px", "25px"]} mt={4}>
            {renderContentSection(typedModuleFile[section])}
          </Wrap>
        </Box>
      )
    }

    return sections
  }

  const getButtonStyling = (questionIndex: number, option: string) => {
    const isSelected = selectedAnswers[questionIndex] === option;
    const correctAnswer = quizAnswers[questionIndex];
    const isCorrect = option === correctAnswer;
    const isWrong = isSelected && !isCorrect;

    // Determine if the user has made a selection
    const hasMadeSelection = selectedAnswers[questionIndex] !== "";

    return {
      color: isSelected || (hasMadeSelection && isCorrect) ? 'white' : 'black',  // High contrast colors
      fontWeight: isSelected ? '900' : '100',
      bg: (isSelected && isCorrect) || (hasMadeSelection && isCorrect) ? 'rgba(76, 175, 80, 0.8)' : isWrong ? 'rgba(244, 67, 54, 0.8)' : 'gray.700',
      border: '4px solid',
      borderColor: (isSelected && isCorrect) ? 'green.300'
        : (hasMadeSelection && isCorrect) ? 'green.800'
          : isWrong ? 'red.400'
            : 'transparent',
      _hover: {
        bg: isSelected
          ? isCorrect
            ? 'rgba(76, 175, 80, 0.8)'
            : 'rgba(244, 67, 54, 0.8)'
          : 'gray.600',
      },
      cursor: isSelected ? 'default' : 'pointer',
      isDisabled: isSelected, // Disable button after selection
      textShadow: '0 0 10px rgba(0, 0, 0, 0.7)', // Strong text shadow to improve legibility
      transition: 'background 0.3s ease, transform 0.3s ease',
      _active: {
        transform: isSelected ? 'scale(0.98)' : '',
      },
      boxShadow: (isSelected && isCorrect) || (hasMadeSelection && isCorrect) ? '0 0 10px rgba(0, 0, 0, 0.3)' : 'none',
    };
  };


  // Render each content section
  const renderContentSection = (items: Module[]) =>
    items.map((item, index) => (
      <WrapItem key={index}>
        <Box
          bg="gray.800"
          width={["150px", "170px", "185px"]} // Responsive widths
          height={["250px", "270px", "285px"]} // Responsive heights
          border={
            item.type === "article" ? "2px double #FFC500" :
              item.type === "video" ? "2px double #D395FF" :
                item.type === "quiz" ? "2px double #884cf7" : "2px double #000000"
          }
          borderRadius="lg"
          transition="all 0.3s ease-in-out"
          boxShadow="0 4px 6px rgba(0, 0, 0, 0.1)"
          _hover={{
            transform: "translateY(-5px)",
            boxShadow: "0 10px 20px rgba(0, 0, 0, 0.2)"
          }}
          onClick={() => setModalStates(item)}
          cursor="pointer"
        >
          <Flex direction="column" align="center" height="100%">
            <Box>
              <Image
                src={item.img}
                alt=""
                boxSize={["145px", "165px", "180px"]} // Responsive image sizes
                borderTopLeftRadius="6px"
                borderTopRightRadius="6px"
                borderBottomLeftRadius="0"
                borderBottomRightRadius="0"
                objectFit="cover"
              />
            </Box>
            <Box
              flex="1"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              p={2}
            >
              <Text
                align="center"
                fontSize={["small", "sm", "sm"]} // Responsive font sizes
                fontFamily="Montserrat,sans-serif"
                fontWeight="bold"
                style={{ overflowWrap: "break-word", width: "100%" }}
              >
                {item.name}
              </Text>
            </Box>

            <Box width="100%" px={2} pb={2}>
              <Flex justify="space-between" align="center" mb={1}>
                <Text
                  fontSize={["xs", "xs", "small"]}
                  fontFamily="Montserrat,sans-serif"
                  fontWeight="semibold" >
                  {item.duration}
                </Text>
                <Text
                  fontFamily="Montserrat,sans-serif"
                  fontWeight="semibold"
                  fontSize={["xs", "xs", "small"]} >
                  {`${Math.round(userProgress[item.name] || 0)}%`}
                </Text>
              </Flex>
              <Box
                width="100%"
                height="4px"
                bg="gray.700"
                borderRadius="full"
                overflow="hidden"
              >
                <Box
                  width={`${userProgress[item.name] ? userProgress[item.name] : 0}%`}
                  height="100%"
                  bg={userProgress[item.name] >= 100 ? "green.400" : "purple.400"}
                  borderRadius="full"
                  transition="width 0.3s ease-in-out"
                />
              </Box>
            </Box>
          </Flex>
        </Box>
      </WrapItem>
    ));


  return (


    <Flex direction="column"> 

      <Flex justifyContent="space-between" alignItems="center" px={4} py={2} bg="gray.800">
        <Text fontWeight="bold" color="white">Your Points: {userPoints}</Text>
      </Flex>

      {renderSections()}


      <Text
            bg="transparent"
            color="#ceaaf2"
            textAlign="left"
            fontWeight="bold"
            fontSize="xl"
            ml={5}
            mt={4}
          >
            Looking for more? Submit your topic suggestions
            <a style={{color: "#B369FD"}} target="_blank" href="https://forms.gle/w3k37uZFMo6QHZUJ6"> here</a>
            !
          </Text>


      {/* GENERAL LESSON MODAL */}
      <Modal size={isMobile ? "full" : "5xl"} isOpen={isLessonModalOpen} onClose={handleCloseModal}>
        <ModalOverlay />
        <ModalContent
          bg="gray.800"
          maxW={isMobile ? "100%" : "70vw"}
          maxH="95vh"
          borderRadius="md"
          mt={isMobile ? "0" : "30px"}
        >
          <ModalCloseButton size="sm" />
          <Flex direction={isMobile ? "column" : "row"} padding={isMobile ? "10px" : "30px"}>
            {/* Left side content with image and intro, adjusted for mobile */}
            <Box width={isMobile ? "100%" : "40%"} marginRight={isMobile ? "0" : "20px"} mt={2}>
              <Box
                bgImage={currentModule.img}
                height={isMobile ? "200px" : "300px"}  // Smaller image on mobile
                borderRadius="md"
                backgroundSize="cover"
                backgroundPosition="center"
                mb={4}
              >
                <Flex
                  height="100%"
                  bg="rgba(0,0,0,0.6)"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="md"
                >
                  <Text as='b' fontSize={isMobile ? "2xl" : "3xl"} color="white" textAlign="center" px={isMobile ? "2" : "30px"}>
                    {currentModule.name}
                  </Text>
                </Flex>
              </Box>
              <Text fontSize={isMobile ? "sm" : "md"} mb={4} color="gray.400">
                By: The Minvest Team, The Financial Literacy Committee
              </Text>
            </Box>

            {/* Right side content with article */}
            <Box width={isMobile ? "100%" : "60%"} mt={2}>
              <Box
                overflowY="auto"
                sx={{
                  maxHeight: { base: "57vh", sm: "60vh", md: "65vh", lg: "67vh" },  // Responsive maxHeight settings similar to the quiz modal
                  pr: 4,
                  bg: "gray.700",
                  padding: "20px",
                  borderRadius: "md",
                  lineHeight: "1.6",
                  fontSize: { base: "16", md: "md" },  // Larger font size for mobile readability
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#1A202C',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#4A5568',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#9B86BD',
                  },
                }}
              >
                <Box paddingLeft={3}>
                  {ReactHtmlParser(loadContent(contentPath))}
                </Box>
              </Box>
            </Box>
          </Flex>
          {/* Bottom part with button */}
          <Flex
            padding="20px"
            justifyContent="flex-end"
            borderTop="1px solid"
            borderColor="gray.600"
            alignItems="center"
          >
            <Button
              colorScheme="purple"
              size="md"
              fontFamily="Montserrat,sans-serif"
              onClick={updateArticleProgress}
              width={isMobile ? "100%" : "auto"}
            >
              {(userProgress[currentModule.name] == 100) ? 'Mark as Incomplete' : 'Mark as Complete'}
            </Button>
          </Flex>
        </ModalContent>
      </Modal>






      {/* GENERAL VIDEO MODAL */}
      < Modal isOpen={isVideoModalOpen} onClose={handleCloseModal} size="4xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <video
            controls
            key={videoSource}
            onTimeUpdate={(e) => {
              const currentTime = (e.target as HTMLVideoElement).currentTime;
              const duration = (e.target as HTMLVideoElement).duration;
              const progress = (currentTime / duration) * 100;

              // only update progress if the user doesn't have the property yet, the progress has updated 5%, or they've finished the video
              if (progress >= 99) {

                // check that the user hasn't already completed video
                if (userProgress[currentModule!.name] != 100) {
                  setUserPoints(userPoints+50);
                }
                
                updateProgress(100);

              } else if (!userProgress[currentModule!.name] || progress > userProgress[currentModule!.name] + 5) {
                updateProgress(progress);
              }

            }}
          >
            <source src={videoSource} type="video/mp4" />
          </video>

          <ModalCloseButton />
        </ModalContent>
      </Modal >


      {/* GENERAL QUIZ MODAL */}
      <Modal size={isMobile ? "full" : "5xl"} isOpen={isQuizModalOpen} onClose={handleCloseModal}>
        <ModalOverlay />
        <ModalContent
          bg="gray.800"
          maxW={isMobile ? "100%" : "70vw"}
          maxH="95vh"
          borderRadius="md"
          mt={isMobile ? "0" : "30px"}
        >
          <ModalCloseButton size="sm" />
          <Flex direction={isMobile ? "column" : "row"} padding={isMobile ? "10px" : "30px"}>
            {/* Conditional layout: Column layout for mobile and row layout for desktop */}
            <Box width={isMobile ? "100%" : "40%"} marginRight={isMobile ? "0" : "20px"} mt={2}>
              <Box
                bgImage={currentModule.img}
                height={isMobile ? "200px" : "300px"}  // Smaller image on mobile
                borderRadius="md"
                backgroundSize="cover"
                backgroundPosition="center"
                mb={4}
              >
                <Flex
                  height="100%"
                  bg="rgba(0,0,0,0.6)"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="md"
                >
                  <Text as='b' fontSize={isMobile ? "2xl" : "3xl"} color="white" textAlign="center" px={isMobile ? "2" : "30px"}>
                    {currentModule.name}
                  </Text>
                </Flex>
              </Box>
              <Text fontSize="13" fontWeight="semibold" fontFamily="Montserrat,sans-serif" >
                {quizQuestions.length} Questions - Unlimited Attempts
              </Text>
              <Box width="100%" bg="gray.600" height="4px" mt={2} mb={4} borderRadius="full">
                <Box
                  width={`${(selectedAnswers.filter(answer => answer !== "").length / quizQuestions.length) * 100}%`}
                  bg="purple.400"
                  height="100%"
                  borderRadius="full"
                  transition="width 0.3s ease-in-out"
                />
              </Box>
            </Box>

            {/* Right side content with quiz questions */}
            <Box width={isMobile ? "100%" : "60%"} mt={2} borderRadius="md">
              <Box
                overflowY="auto"
                sx={{
                  maxHeight: { base: "57vh", sm: "60vh", md: "65vh", lg: "72vh" },  // Responsive maxHeight settings
                  pr: 4,
                  bg: "gray.700",
                  padding: "20px",
                  borderRadius: "md",
                  lineHeight: "1.6",
                  fontSize: { base: "16", md: "md" },  // Responsive font size
                  '&::-webkit-scrollbar': {
                    width: '8px',  // Scrollbar width
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#1A202C',  // Scrollbar track color
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#4A5568',  // Scrollbar thumb color
                    borderRadius: '4px',  // Rounded corners for the scrollbar thumb
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#9B86BD',  // Scrollbar thumb color on hover
                  },
                }}
              >
                {quizQuestions.map((question, questionIndex) => (
                  <React.Fragment key={questionIndex}>
                    <Flex
                      alignItems="flex-start"
                      mb={5}
                      mt={4}
                    >
                      <Text
                        fontSize={18}
                        fontWeight="semibold"
                        fontFamily="Montserrat,sans-serif"
                        mr={2}
                        flexShrink={0}
                        color="gray.100"
                      >
                        {questionIndex + 1}.
                      </Text>
                      <Text
                        fontSize={18}
                        fontWeight="semibold"
                        fontFamily="Montserrat,sans-serif"
                        color="gray.100"
                      >
                        {question.question}
                      </Text>
                    </Flex>
                    {question.options.map((option, optionIndex) => (
                      <Button
                        key={optionIndex}
                        onClick={() => handleAnswerSelect(questionIndex, option)}
                        {...getButtonStyling(questionIndex, option)}
                        fontSize={16}
                        fontWeight="normal"
                        color="white"
                        backgroundColor="#12101a"
                        fontFamily="Montserrat,sans-serif"
                        overflowWrap="break-word"
                        whiteSpace="normal"
                        textAlign="left"
                        justifyContent="flex-start"
                        width="100%"
                        mb={2}
                        transition="all 0.2s"
                        px={4}
                        borderRadius="md"  // Added for visual appeal
                        boxShadow="md"  // Added for visual appeal
                        height="auto"  // Added to allow vertical expansion
                        minHeight={12}  // Added to maintain minimum height
                      >
                        {option}
                      </Button>
                    ))}
                  </React.Fragment>
                ))}
              </Box>
            </Box>
          </Flex>
          {/* Bottom part with submit button */}
          <Flex
            padding="20px"
            justifyContent={isMobile ? "center" : "flex-end"}  // Center button on mobile
            borderTop="1px solid"
            borderColor="gray.600"
            alignItems="center"
          >
            {/* Display quiz result */}
            <Text fontSize="md" mr={isMobile ? "0" : "4"}>{quizResult}</Text>
            {/* Submit button */}
            <Button
              colorScheme="purple"
              size="md"
              fontFamily="Montserrat,sans-serif"
              onClick={handleQuizSubmit}
              width={isMobile ? "100%" : "auto"}
            >
              Submit
            </Button>
          </Flex>
        </ModalContent>
      </Modal>



    </Flex >
  );
};

export default MinvestEd;